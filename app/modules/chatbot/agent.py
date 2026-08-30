"""
LiveKit Voice Agent — Haji Cafe
================================
Architecture: Single flat agent with direct tool access.

The text chatbot uses a supervisor→routing→specialist chain which relies on
engine.py's 7-step loop. That pattern does NOT work in LiveKit's pipeline
because there is no loop — the LLM just calls tools and returns.

For voice we use a FLAT approach:
  - One agent with ALL real tools directly available (no routing functions)
  - The LLM picks the right tool itself based on the query
  - No multi-hop routing, no specialist switching
"""

import logging
import os
import sys
import asyncio
from pathlib import Path
from dotenv import load_dotenv

# Ensure the project root is on sys.path so `app.*` imports work in the job subprocess
PROJECT_ROOT = Path(__file__).resolve().parents[3]  # cafe-project/
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli
from livekit.agents.voice import Agent, AgentSession
from livekit.agents.voice.turn import TurnHandlingOptions
from livekit.agents import llm as agents_llm
from livekit.plugins import groq, deepgram, elevenlabs, silero

load_dotenv()

logger = logging.getLogger("livekit-agent")

# Pre-load Silero VAD model with comfortable silence threshold to avoid splitting slow speech
_vad = silero.VAD.load(
    min_speech_duration=0.1,
    min_silence_duration=0.8,
    prefix_padding_duration=0.5,
)


async def _load_user(user_id: int):
    """Load the full user record with role, scopes, and owned cafes from the database."""
    from app.database import db
    user = await db.user.find_unique(
        where={"id": user_id},
        include={
            "role": True,
            "ownedCafes": {
                "include": {
                    "branches": True,
                }
            },
            "userScopes": {
                "include": {
                    "cafe": True,
                    "branch": True,
                }
            },
        },
    )
    if not user:
        return None

    # Filter out archived scopes matching core dependencies
    filtered_scopes = []
    for scope in (user.userScopes or []):
        cafe_is_archived = False
        if scope.cafe and scope.cafe.isArchived:
            cafe_is_archived = True
        if scope.branch and scope.branch.cafe and scope.branch.cafe.isArchived:
            cafe_is_archived = True
        if not cafe_is_archived:
            filtered_scopes.append(scope)
    user.userScopes = filtered_scopes
    return user


def _build_voice_system_prompt(current_user) -> str:
    """
    Build a voice-optimised system prompt using the base user context and live date/time.
    """
    import zoneinfo
    from datetime import datetime, timedelta
    from app.modules.chatbot.agents.base import get_base_prompt

    # Localized date and time
    from datetime import datetime, timedelta, timezone

    user_tz_name = getattr(current_user, "timezone", "UTC") or "UTC"
    now = None
    try:
        import zoneinfo
        tz = zoneinfo.ZoneInfo(user_tz_name)
        now = datetime.now(tz)
    except Exception:
        pass

    if now is None:
        try:
            import zoneinfo
            tz = zoneinfo.ZoneInfo("UTC")
            now = datetime.now(tz)
        except Exception:
            now = datetime.now(timezone.utc)
            user_tz_name = "UTC"

    tomorrow = now + timedelta(days=1)
    current_time_str = now.strftime("%A, %B %d, %Y at %I:%M %p")
    today_iso = now.strftime("%Y-%m-%d")
    tomorrow_iso = tomorrow.strftime("%Y-%m-%d")

    base = get_base_prompt(current_user, body=None)
    role_name = current_user.role.name

    time_context = (
        f"\nCURRENT LIVE TIME & DATE:\n"
        f"- Current Time: {current_time_str} (Timezone: {user_tz_name})\n"
        f"- Today's Date: {today_iso} ({now.strftime('%A')})\n"
        f"- Tomorrow's Date: {tomorrow_iso}\n"
        f"Use this exact timestamp to accurately resolve relative requests like 'today', 'tomorrow', or 'this afternoon'."
    )

    # Role-specific tool guidance
    if role_name == "STAFF":
        tool_guidance = (
            "You have direct access to order and inventory tools. "
            "For any question about orders or order status, call get_recent_orders or get_order_by_id directly."
        )
    elif role_name == "BRANCH_MANAGER":
        tool_guidance = (
            "You have direct access to inventory, order, and business intelligence tools.\n"
            "- For menu/stock questions call get_branch_inventory, search_menu, or update_branch_menu_item.\n"
            "- For order questions call get_recent_orders or get_order_by_id directly.\n"
            "- For business performance, forecasts, rush hours, or margins, call get_sales_forecast_insight, get_peak_traffic_and_staffing, or query_cafe_intelligence."
        )
    else:  # CAFE_OWNER / SUPER_ADMIN
        tool_guidance = (
            "You have full access to executive business intelligence, RAG knowledge search, sales forecasting, BCG matrix, combo engineering, cafes, menus, inventory, staff, and meeting tools.\n"
            "WORKFLOW INSTRUCTIONS:\n"
            "1. When the user asks about business performance, forecasts, profit margins, anomalies, or combo deals:\n"
            "   - Call get_sales_forecast_insight, get_menu_engineering_bcg, get_historical_anomaly_diagnostic, suggest_combo_promotions, or query_cafe_intelligence.\n"
            "2. When the user asks to schedule a staff meeting:\n"
            "   - First call get_staff_list to fetch the available staff members.\n"
            "   - Then call schedule_meeting with start_time_iso, end_time_iso, and the staff integer IDs.\n"
            "3. When the user asks about cafes, branches, or menus:\n"
            "   - Call get_my_cafes, get_branches_for_cafe, or get_menu directly.\n"
            "4. When the user asks about orders:\n"
            "   - Call get_recent_orders or get_order_by_id directly."
        )

    voice_rules = (
        "\n\nVOICE MODE RULES — CRITICAL:\n"
        "1. You are speaking aloud over voice — never use markdown, bullet points, asterisks, or raw formatting.\n"
        "2. Keep spoken responses short, natural, and conversational (2-3 sentences max).\n"
        "3. ALWAYS call tools to retrieve real data before answering questions.\n"
        "4. After a tool returns data, summarise it conversationally in plain English.\n"
        "5. Never read out raw JSON, long ID strings, or database technicalities."
    )

    return f"{base}\n{time_context}\n\n{tool_guidance}{voice_rules}"


def _build_voice_tools(current_user) -> list:
    """
    Build a flat list of real data tools for the voice agent.
    """
    logger.info(f"REAL_CALL_LOG: user_id={getattr(current_user, 'id', None)}, email={getattr(current_user, 'email', None)}")
    
    from app.modules.chatbot.tools.registry import build_tools

    role_name = current_user.role.name

    if role_name == "STAFF":
        real_tools = build_tools(current_user, "order")
    elif role_name == "BRANCH_MANAGER":
        real_tools = build_tools(current_user, "inventory") + build_tools(current_user, "order") + build_tools(current_user, "business")
    else:  # CAFE_OWNER / SUPER_ADMIN
        real_tools = build_tools(current_user, "all")

    return [agents_llm.function_tool(fn) for fn in real_tools]


async def entrypoint(ctx: JobContext):
    from app.database import db

    await db.connect()
    try:
        await _run_session(ctx)
    finally:
        await db.disconnect()


async def _run_session(ctx: JobContext):
    # ------------------------------------------------------------------
    # 1. Connect and find the human participant
    # ------------------------------------------------------------------
    await ctx.connect(auto_subscribe=AutoSubscribe.SUBSCRIBE_ALL)

    user_id: int | None = None
    user_timezone: str | None = None
    for _ in range(20):  # wait up to 10 seconds
        for participant in ctx.room.remote_participants.values():
            if participant.metadata:
                try:
                    import json
                    meta_dict = json.loads(participant.metadata)
                    if isinstance(meta_dict, dict):
                        user_id = int(meta_dict.get("user_id"))
                        if meta_dict.get("timezone"):
                            user_timezone = str(meta_dict.get("timezone"))
                    else:
                        user_id = int(participant.metadata)
                except Exception:
                    try:
                        user_id = int(participant.metadata)
                    except (ValueError, TypeError):
                        pass
            if not user_id and participant.identity:
                # Fallback: extract numeric ID from 'user-123'
                ident = participant.identity
                if ident.startswith("user-"):
                    try:
                        user_id = int(ident.replace("user-", ""))
                        break
                    except (ValueError, TypeError):
                        pass
        if user_id:
            break
        await asyncio.sleep(0.5)

    logger.info(f"REAL_CALL_LOG: After participant loop, user_id is: {user_id}, tz is: {user_timezone}")

    if not user_id:
        logger.error("No user ID found in participant metadata or identity — aborting job")
        return

    # ------------------------------------------------------------------
    # 2. Load user from database
    # ------------------------------------------------------------------
    current_user = await _load_user(user_id)
    logger.info(f"REAL_CALL_LOG: After _load_user, current_user is: {current_user}")
    
    if not current_user:
        logger.error(f"User {user_id} not found in database — aborting job")
        return

    # Set timezone preference (defaulting to client timezone or Asia/Karachi over naive UTC)
    if user_timezone:
        current_user.timezone = user_timezone
    elif not getattr(current_user, "timezone", None) or current_user.timezone.upper() == "UTC":
        current_user.timezone = "Asia/Karachi"

    logger.info(f"Voice session started: user={current_user.id} role={current_user.role.name} tz={current_user.timezone}")

    # ------------------------------------------------------------------
    # 3. Build flat voice prompt + tools
    # ------------------------------------------------------------------
    system_prompt = _build_voice_system_prompt(current_user)
    tools = _build_voice_tools(current_user)

    logger.info(f"Voice agent ready with {len(tools)} tools for role {current_user.role.name}")

    # ------------------------------------------------------------------
    # 4. Start the voice session with tuned turn handling
    # ------------------------------------------------------------------
    turn_handling = TurnHandlingOptions(
        endpointing={
            "mode": "dynamic",
            "min_delay": 0.9,   # Allow natural pauses without splitting sentences into fragments
            "max_delay": 3.5,
        },
        interruption={
            "enabled": True,
            "min_duration": 0.6,
            "min_words": 1,
            "resume_false_interruption": True,
        },
        preemptive_generation={
            "enabled": False,  # Avoid rapid canceled LLM calls on incomplete user phrases
        },
    )

    session = AgentSession(
        vad=_vad,
        stt=deepgram.STT(),
        llm=groq.LLM(model="openai/gpt-oss-120b"),
        tts=elevenlabs.TTS(
            voice_id=os.environ.get("ELEVENLABS_VOICE_ID", "JBFqnCBsd6RMkjVDRZzb"),
            api_key=os.environ.get("ELEVENLABS_API_KEY"),
        ),
        turn_handling=turn_handling,
        max_tool_steps=5,
    )

    @session.on("error")
    def on_session_error(err):
        logger.error(f"LiveKit Voice Session error: {err}")

    await session.start(
        room=ctx.room,
        agent=Agent(
            instructions=system_prompt,
            tools=tools,
        ),
    )

    # ------------------------------------------------------------------
    # 5. Role-aware greeting
    # ------------------------------------------------------------------
    role_name = current_user.role.name
    if role_name == "SUPER_ADMIN":
        greeting = "Hi! I'm your Haji Cafe voice assistant. You have full platform access. What can I help you with?"
    elif role_name == "CAFE_OWNER":
        greeting = "Hi! I'm your Haji Cafe assistant. Ask me about your cafes, menus, inventory, or orders."
    elif role_name == "BRANCH_MANAGER":
        greeting = "Hi! I'm your branch assistant. I can check inventory and orders for you. What do you need?"
    else:
        greeting = "Hi! I'm your assistant. I can help you check order status. Go ahead."

    await session.generate_reply(
        instructions=f"Greet the user with this exact message: '{greeting}'"
    )

    # ------------------------------------------------------------------
    # 6. Keep session alive until user leaves or room disconnects
    # ------------------------------------------------------------------
    shutdown_event = asyncio.Event()

    @ctx.room.on("disconnected")
    def on_disconnected(*args, **kwargs):
        shutdown_event.set()

    @ctx.room.on("participant_disconnected")
    def on_participant_disconnected(*args, **kwargs):
        if not ctx.room.remote_participants:
            shutdown_event.set()

    ctx.add_shutdown_callback(lambda: shutdown_event.set())

    await shutdown_event.wait()
    logger.info(f"Voice session ended for user {current_user.id}")


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
