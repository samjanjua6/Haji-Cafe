import os
import asyncio
from dotenv import load_dotenv

from livekit.plugins import groq, elevenlabs
from livekit.agents.llm import ChatContext, ChatMessage

load_dotenv()

async def main():
    print("Testing Groq LLM...")
    llm = groq.LLM(model="openai/gpt-oss-120b")
    
    ctx = ChatContext()
    ctx.messages.append(ChatMessage(role="user", content="Say hello world."))
    
    try:
        stream = await llm.chat(chat_ctx=ctx)
        print("Groq streaming started...")
        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                print(chunk.choices[0].delta.content, end="")
        print("\nGroq OK!")
    except Exception as e:
        print(f"Groq failed: {e}")

    print("\nTesting ElevenLabs TTS...")
    try:
        tts = elevenlabs.TTS(
            voice_id=os.environ.get("ELEVENLABS_VOICE_ID", "JBFqnCBsd6RMkjVDRZzb"),
            api_key=os.environ.get("ELEVENLABS_API_KEY"),
        )
        stream = tts.synthesize("Hello world")
        print("ElevenLabs OK!")
    except Exception as e:
        print(f"ElevenLabs failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
