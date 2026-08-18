"""
LiveKit Voice Agent — fully integrated with the Haji Cafe chatbot engine.

On each job dispatch the agent:
1. Reads the user ID from the joining participant's metadata
2. Loads the full user record (role + scopes) from the database
3. Builds the same supervisor system-prompt used by the text chatbot
4. Wraps every tool (cafe, inventory, order) as a LiveKit function_tool
5. Starts a voice session so the user can talk to the same AI they type to
"""

import logging
import os
import sys
import json
import inspect
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


def _build_livekit_function_tools(current_user) -> list:
    """
    Convert every existing tool function into a LiveKit function_tool.
    The existing tools are plain async callables — we wrap them with the
    @agents_llm.function_tool decorator so LiveKit can call them during voice turns.
    """
    from app.modules.chatbot.tools.registry import build_tools
    from app.modules.chatbot.core.engine import (
        route_to_cafe_specialist,
        route_to_inventory_specialist,
        route_to_order_specialist,
    )

    role_name = current_user.role.name

    # Routing tools — same role-based set as the supervisor
    if role_name == "STAFF":
        routing_fns = [route_to_order_specialist]
    elif role_name == "BRANCH_MANAGER":
        routing_fns = [route_to_inventory_specialist, route_to_order_specialist]
    else:
        routing_fns = [route_to_cafe_specialist, route_to_inventory_specialist, route_to_order_specialist]

    # Specialist tools (cafe, inventory, orders)
    all_tools = build_tools(current_user, "all")

    livekit_tools = []
    for fn in routing_fns + all_tools:
        # Wrap each callable as a LiveKit function_tool
        livekit_tools.append(agents_llm.function_tool(fn))

    return livekit_tools


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
    # 1. Find the human participant and read their user ID from metadata
    # ------------------------------------------------------------------
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    user_id: int | None = None
    # Wait up to 10 seconds for a human participant to join
    for _ in range(20):
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

    if not user_id:
        logger.error("No user ID found in participant metadata — aborting job")
        return

    # ------------------------------------------------------------------
    # 2. Load the full user record from the database
    # ------------------------------------------------------------------
    current_user = await _load_user(user_id)
    if not current_user:
        logger.error(f"User {user_id} not found in database — aborting job")
        return

    logger.info(f"Voice session for user {current_user.id} ({current_user.role.name})")

    # ------------------------------------------------------------------
    # 3. Build the system prompt (same as text chatbot supervisor)
    # ------------------------------------------------------------------
    from app.modules.chatbot.agents.supervisor import get_supervisor_prompt
    system_prompt = get_supervisor_prompt(current_user, body=None)

    # Add a voice-specific note so the AI keeps responses concise
    system_prompt += (
        "\n\nIMPORTANT — VOICE MODE: The user is talking to you via voice. "
        "Keep ALL responses short, conversational, and free of markdown formatting. "
        "No bullet points, no asterisks, no headers. Speak naturally as if in a conversation."
    )

    # ------------------------------------------------------------------
    # 4. Build tools — same role-based tool set as the text chatbot
    # ------------------------------------------------------------------
    tools = _build_livekit_function_tools(current_user)

    # ------------------------------------------------------------------
    # 5. Start the voice session
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

    # Greet the user by role
    role_name = current_user.role.name
    if role_name == "SUPER_ADMIN":
        greeting = "Hello! I'm your Haji Cafe assistant. As a Super Admin you have full platform access. What can I help you with?"
    elif role_name == "CAFE_OWNER":
        greeting = "Hello! I'm your Haji Cafe assistant. I can help you with your cafes, menus, inventory, and orders. What do you need?"
    elif role_name == "BRANCH_MANAGER":
        greeting = "Hello! I'm your branch assistant. I can help with inventory and orders. What can I do for you?"
    else:
        greeting = "Hello! I'm your assistant. I can help you check order status. What do you need?"

    await session.generate_reply(instructions=f"Greet the user with exactly this message: '{greeting}'")


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
