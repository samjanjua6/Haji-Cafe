import re
import httpx
from app.config import settings

DEEPGRAM_URL = "https://api.deepgram.com/v1/listen"
DEEPGRAM_TTS_URL = "https://api.deepgram.com/v1/speak"
ELEVENLABS_URL = "https://api.elevenlabs.io/v1/text-to-speech"


def _strip_markdown(text: str) -> str:
    """Strip markdown formatting so TTS reads clean, natural text aloud."""
    # Remove code blocks
    text = re.sub(r"```[\s\S]*?```", "", text)
    text = re.sub(r"`[^`]+`", "", text)
    # Remove markdown tables (| header | header |)
    text = re.sub(r"\|[^\n]+\|", "", text)
    # Remove headers
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.MULTILINE)
    # Remove bold/italic
    text = re.sub(r"\*{1,3}([^*]+)\*{1,3}", r"\1", text)
    text = re.sub(r"_{1,3}([^_]+)_{1,3}", r"\1", text)
    # Remove links [text](url) -> text
    text = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", text)
    # Remove bullet points
    text = re.sub(r"^\s*[-*+]\s+", "", text, flags=re.MULTILINE)
    # Remove numbered lists
    text = re.sub(r"^\s*\d+\.\s+", "", text, flags=re.MULTILINE)
    # Collapse extra whitespace and newlines
    text = re.sub(r"\n{2,}", ". ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


async def speech_to_text(audio_bytes: bytes, content_type: str = "audio/webm") -> str:
    """
    Send audio bytes to Deepgram Nova-2 and return the transcript string.
    """
    if not settings.DEEPGRAM_API_KEY:
        raise ValueError("DEEPGRAM_API_KEY is not configured.")

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{DEEPGRAM_URL}?model=nova-2&smart_format=true&language=en",
            content=audio_bytes,
            headers={
                "Authorization": f"Token {settings.DEEPGRAM_API_KEY}",
                "Content-Type": content_type or "audio/webm",
            },
        )
        resp.raise_for_status()
        data = resp.json()
        transcript = (
            data.get("results", {})
            .get("channels", [{}])[0]
            .get("alternatives", [{}])[0]
            .get("transcript", "")
        )
        return transcript


async def _deepgram_tts(text: str) -> bytes:
    """
    Send text to Deepgram Aura TTS and return MP3 audio bytes.
    Ultra-low latency (~200ms) with natural conversational tone.
    """
    if not settings.DEEPGRAM_API_KEY:
        raise ValueError("DEEPGRAM_API_KEY is not configured in .env")

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{DEEPGRAM_TTS_URL}?model=aura-asteria-en",
            json={"text": text},
            headers={
                "Authorization": f"Token {settings.DEEPGRAM_API_KEY}",
                "Content-Type": "application/json",
            },
        )
        if not resp.is_success:
            print(f"[Deepgram TTS Error] status={resp.status_code} body={resp.text}")
            raise ValueError(f"Deepgram TTS error {resp.status_code}: {resp.text}")
        return resp.content


async def text_to_speech(text: str) -> bytes:
    """
    Send text to TTS engine and return audio bytes (mp3).
    Attempts ElevenLabs if configured, falling back seamlessly to Deepgram Aura TTS.
    """
    clean_text = _strip_markdown(text)
    if not clean_text:
        return b""

    # 1. Attempt ElevenLabs if API key is configured
    if settings.ELEVENLABS_API_KEY:
        voice_id = settings.ELEVENLABS_VOICE_ID or "EXAVITQu4vr4xnSDxMaL"
        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                resp = await client.post(
                    f"{ELEVENLABS_URL}/{voice_id}/stream",
                    json={
                        "text": clean_text,
                        "model_id": "eleven_turbo_v2_5",
                        "voice_settings": {
                            "stability": 0.5,
                            "similarity_boost": 0.75,
                            "style": 0.0,
                            "use_speaker_boost": True,
                        },
                    },
                    headers={
                        "xi-api-key": settings.ELEVENLABS_API_KEY,
                        "Content-Type": "application/json",
                    },
                )
                if resp.is_success and len(resp.content) > 0:
                    return resp.content
                print(f"[ElevenLabs TTS Notice] status={resp.status_code} - Falling back to Deepgram Aura TTS...")
        except Exception as e:
            print(f"[ElevenLabs TTS Error] {e} - Falling back to Deepgram Aura TTS...")

    # 2. Fallback to Deepgram Aura TTS (active credits, high quality)
    if settings.DEEPGRAM_API_KEY:
        try:
            return await _deepgram_tts(clean_text)
        except Exception as e:
            print(f"[Deepgram TTS Error] {e}")
            raise

    raise ValueError("Neither ElevenLabs nor Deepgram TTS could synthesize audio. Check API keys.")
