import asyncio
import logging
import os
from dotenv import load_dotenv
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, llm
from livekit.agents.voice import Agent
from livekit.plugins import groq, deepgram, elevenlabs

load_dotenv()

logger = logging.getLogger("livekit-agent")

async def entrypoint(ctx: JobContext):
    # Initial context for the AI
    initial_ctx = llm.ChatContext()
    initial_ctx.add_message(
        role="system",
        content="You are a helpful AI assistant for Haji Cafe. Keep your responses conversational, warm, and concise."
    )

    # Connect to the LiveKit room, subscribing only to audio tracks (microphone)
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Instantiate the Agent with our chosen plugins
    assistant = Agent(
        vad=deepgram.VAD(),
        stt=deepgram.STT(),
        llm=groq.LLM(model="openai/gpt-oss-120b"),
        tts=elevenlabs.TTS(voice=os.environ.get("ELEVENLABS_VOICE_ID", "JBFqnCBsd6RMkjVDRZzb")),
        chat_ctx=initial_ctx,
    )

    # Start the assistant in the room
    assistant.start(ctx.room)

    # Give the assistant a moment to connect, then greet the user
    await asyncio.sleep(1)
    await assistant.say("Hello! I am your Haji Cafe assistant. How can I help you?", allow_interruptions=True)

if __name__ == "__main__":
    # Start the CLI which handles connecting to LiveKit Cloud
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
