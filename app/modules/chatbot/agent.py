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
from livekit.agents import llm as agents_llm
from livekit.plugins import groq, deepgram, elevenlabs, silero

load_dotenv()

logger = logging.getLogger("livekit-agent")

# Pre-load Silero VAD model once at startup — avoids the download delay per job
_vad = silero.VAD.load()


async def _load_user(user_id: int):
    """Load the full user record with role and scopes from the database."""
    from app.database import db
    return await db.user.find_unique(
        where={"id": user_id},
        include={
            "role": True,
            "userScopes": {
                "include": {
                    "cafe": True,
                    "branch": True,
                }
            },
        },
    )


def _build_voice_system_prompt(current_user) -> str:
    """
    Build a voice-optimised system prompt using the base user context.
    We intentionally DO NOT use get_supervisor_prompt() because that prompt
    contains routing instructions that don't apply in the flat voice pipeline.
    """
    from app.modules.chatbot.agents.base import get_base_prompt

    base = get_base_prompt(current_user, body=None)
    role_name = current_user.role.name

    # Role-specific tool guidance (flat — no routing)
    if role_name == "STAFF":
        tool_guidance = (
            "You have access to order tools. "
            "For any question about orders or order status, call get_recent_orders or get_order_by_id directly."
        )
    elif role_name == "BRANCH_MANAGER":
        tool_guidance = (
            "You have access to inventory and order tools. "
            "For menu/stock questions call get_menu, get_branch_inventory, or search_menu. "
            "For order questions call get_recent_orders or get_order_by_id."
        )
    else:  # CAFE_OWNER / SUPER_ADMIN
        tool_guidance = (
            "You have access to cafe, inventory, and order tools. "
            "For cafe/branch/staff questions call get_my_cafes, get_cafe, get_branches_for_cafe, or get_staff_list. "
            "For menu/stock questions call get_menu, get_branch_inventory, or search_menu. "
            "For order questions call get_recent_orders or get_order_by_id."
        )

    voice_rules = (
        "\n\nVOICE MODE RULES — CRITICAL:\n"
        "1. You are speaking aloud — never use markdown, bullet points, asterisks, or headers.\n"
        "2. Keep responses short and conversational (2-4 sentences max).\n"
        "3. ALWAYS call a tool before answering questions about real data (cafes, orders, inventory).\n"
        "4. After a tool returns data, summarise it verbally in plain English.\n"
        "5. Never read out IDs, long lists, or raw JSON — pick the most important info.\n"
        "6. If a tool returns multiple items, say 'You have X items' and name a few examples.\n"
        "7. DO NOT HALLUCINATE any data. If you don't have a tool for something, say so.\n"
    )

    return f"{base}\n\n{tool_guidance}{voice_rules}"


def _build_voice_tools(current_user) -> list:
    """
    Build a flat list of real data tools for the voice agent.
    We deliberately EXCLUDE routing tools (route_to_cafe_specialist etc.)
    because they only work inside engine.py's multi-step loop.
    """
    logger.info(f"REAL_CALL_LOG: user_id={getattr(current_user, 'id', None)}, email={getattr(current_user, 'email', None)}")
    logger.info(f"REAL_CALL_LOG: scopes at build_voice_tools time = {getattr(current_user, 'userScopes', 'N/A')}")
    
    from app.modules.chatbot.tools.registry import build_tools

    role_name = current_user.role.name

    # Build only the specialist tools the user's role allows
    if role_name == "STAFF":
        real_tools = build_tools(current_user, "order")
    elif role_name == "BRANCH_MANAGER":
        real_tools = build_tools(current_user, "inventory") + build_tools(current_user, "order")
    else:  # CAFE_OWNER / SUPER_ADMIN
        real_tools = build_tools(current_user, "all")

    # Wrap each callable as a LiveKit function_tool
    return [agents_llm.function_tool(fn) for fn in real_tools]


async def entrypoint(ctx: JobContext):
    from app.database import db

    # Connect to DB for the entire session lifetime
    await db.connect()
    try:
        await _run_session(ctx)
    finally:
        await db.disconnect()


async def _run_session(ctx: JobContext):
    # ------------------------------------------------------------------
    # 1. Connect and find the human participant
    # ------------------------------------------------------------------
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    user_id: int | None = None
    for _ in range(20):  # wait up to 10 seconds
        for participant in ctx.room.remote_participants.values():
            if participant.metadata:
                try:
                    user_id = int(participant.metadata)
                    break
                except (ValueError, TypeError):
                    pass
        if user_id:
            break
        await asyncio.sleep(0.5)

    logger.info(f"REAL_CALL_LOG: After participant loop, user_id is: {user_id}")

    if not user_id:
        logger.error("No user ID found in participant metadata — aborting job")
        return

    # ------------------------------------------------------------------
    # 2. Load user from database
    # ------------------------------------------------------------------
    current_user = await _load_user(user_id)
    logger.info(f"REAL_CALL_LOG: After _load_user, current_user is: {current_user}")
    
    if not current_user:
        logger.error(f"User {user_id} not found in database — aborting job")
        return

    logger.info(f"Voice session started: user={current_user.id} role={current_user.role.name}")

    # ------------------------------------------------------------------
    # 3. Build flat voice prompt + tools (no supervisor routing)
    # ------------------------------------------------------------------
    logger.info(f"VOICE_IDENTITY_CHECK: user_id={current_user.id}, email={current_user.email}, role={current_user.role.name}, scopes={[s.model_dump() for s in current_user.userScopes]}")
    
    system_prompt = _build_voice_system_prompt(current_user)
    tools = _build_voice_tools(current_user)

    logger.info(f"Voice agent ready with {len(tools)} tools for role {current_user.role.name}")

    # ------------------------------------------------------------------
    # 4. Start the voice session
    # ------------------------------------------------------------------
    session = AgentSession(
        vad=_vad,
        stt=deepgram.STT(),
        llm=groq.LLM(model="openai/gpt-oss-120b"),
        tts=elevenlabs.TTS(
            voice_id=os.environ.get("ELEVENLABS_VOICE_ID", "JBFqnCBsd6RMkjVDRZzb"),
            api_key=os.environ.get("ELEVENLABS_API_KEY"),
        ),
    )

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


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
