import re
import httpx
from app.config import settings

DEEPGRAM_URL = "https://api.deepgram.com/v1/listen"
ELEVENLABS_URL = "https://api.elevenlabs.io/v1/text-to-speech"


def _strip_markdown(text: str) -> str:
    """Strip markdown formatting so ElevenLabs reads clean text aloud."""
    # Remove code blocks
    text = re.sub(r"```[\s\S]*?```", "", text)
    text = re.sub(r"`[^`]+`", "", text)
    # Remove headers
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.MULTILINE)
    # Remove bold/italic
    text = re.sub(r"\*{1,3}([^*]+)\*{1,3}", r"\1", text)
    text = re.sub(r"_{1,3}([^_]+)_{1,3}", r"\1", text)
    # Remove links
    text = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", text)
    # Remove bullet points
    text = re.sub(r"^\s*[-*+]\s+", "", text, flags=re.MULTILINE)
    # Remove numbered lists
    text = re.sub(r"^\s*\d+\.\s+", "", text, flags=re.MULTILINE)
    # Collapse extra whitespace
    text = re.sub(r"\n{3,}", "\n\n", text)
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


async def text_to_speech(text: str) -> bytes:
    """
    Send text to ElevenLabs streaming endpoint and return audio bytes (mp3).
    """
    if not settings.ELEVENLABS_API_KEY:
        raise ValueError("ELEVENLABS_API_KEY is not configured in .env")

    clean_text = _strip_markdown(text)
    if not clean_text:
        return b""

    voice_id = settings.ELEVENLABS_VOICE_ID

    async with httpx.AsyncClient(timeout=60.0) as client:
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
        if not resp.is_success:
            error_detail = resp.text
            print(f"[ElevenLabs TTS Error] status={resp.status_code} body={error_detail}")
            raise ValueError(f"ElevenLabs API error {resp.status_code}: {error_detail}")
        return resp.content
