import os
import sys
from pathlib import Path
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

load_dotenv()

from livekit.plugins import groq, deepgram, elevenlabs, silero
from livekit.agents.voice import Agent, AgentSession
from livekit.agents.voice.turn import TurnHandlingOptions

def test_turn_options():
    vad = silero.VAD.load(min_silence_duration=0.8)
    turn_handling = TurnHandlingOptions(
        endpointing={"mode": "dynamic", "min_delay": 0.9, "max_delay": 3.5},
        interruption={"enabled": True, "min_duration": 0.5, "min_words": 1},
        preemptive_generation={"enabled": False}
    )
    session = AgentSession(
        vad=vad,
        stt=deepgram.STT(),
        llm=groq.LLM(model="openai/gpt-oss-120b"),
        tts=elevenlabs.TTS(
            voice_id=os.environ.get("ELEVENLABS_VOICE_ID", "JBFqnCBsd6RMkjVDRZzb"),
            api_key=os.environ.get("ELEVENLABS_API_KEY"),
        ),
        turn_handling=turn_handling,
        max_tool_steps=5,
    )
    print("AgentSession with refined TurnHandlingOptions created successfully!")

if __name__ == "__main__":
    test_turn_options()
