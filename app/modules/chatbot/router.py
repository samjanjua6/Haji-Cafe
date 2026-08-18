from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, WebSocketException, status, UploadFile, File
from fastapi.responses import Response
from pydantic import BaseModel
from app.core.dependencies import get_current_user
from app.core.security import decode_access_token
from app.database import db
from jose import JWTError
from .schemas import ChatRequest, ChatResponse, ChatMessage
from app.modules.chatbot.core import engine
from . import voice as voice_service

router = APIRouter(prefix="/chatbot", tags=["chatbot"])


class TTSRequest(BaseModel):
    text: str

import os
from livekit.api import AccessToken, VideoGrants

@router.get("/livekit-token")
async def get_livekit_token(current_user=Depends(get_current_user)):
    """Generate a secure LiveKit token for the current user to join their private chatbot room."""
    api_key = os.environ.get("LIVEKIT_API_KEY")
    api_secret = os.environ.get("LIVEKIT_API_SECRET")
    
    if not api_key or not api_secret:
        raise HTTPException(status_code=500, detail="LiveKit credentials missing")
        
    room_name = f"chatbot-room-{current_user.id}"
    
    grant = VideoGrants(
        room_join=True, 
        room=room_name,
        can_publish=True,
        can_publish_data=True,
        can_subscribe=True
    )
    
    token = (
        AccessToken(api_key, api_secret)
        .with_grants(grant)
        .with_identity(f"user-{current_user.id}")
        .with_name(current_user.email)
        .with_metadata(str(current_user.id))  # agent reads this to load user context
    )
    
    return {"token": token.to_jwt(), "room": room_name}


from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, WebSocketException, status, UploadFile, File, HTTPException

@router.post("/stt")
async def speech_to_text_endpoint(
    audio: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    """Convert uploaded audio to text using Deepgram Nova-2."""
    try:
        audio_bytes = await audio.read()
        transcript = await voice_service.speech_to_text(audio_bytes, audio.content_type)
        return {"transcript": transcript}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tts")
async def text_to_speech_endpoint(
    body: TTSRequest,
    current_user=Depends(get_current_user),
):
    """Convert text to speech audio (mp3) using ElevenLabs."""
    try:
        audio_bytes = await voice_service.text_to_speech(body.text)
        return Response(content=audio_bytes, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tts/test")
async def test_tts(current_user=Depends(get_current_user)):
    """Test ElevenLabs connectivity and return diagnostic info."""
    from app.config import settings
    import httpx
    voice_id = settings.ELEVENLABS_VOICE_ID
    api_key = settings.ELEVENLABS_API_KEY
    if not api_key:
        return {"status": "error", "message": "ELEVENLABS_API_KEY is missing from .env"}
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream",
                json={"text": "Hello!", "model_id": "eleven_turbo_v2_5"},
                headers={"xi-api-key": api_key, "Content-Type": "application/json"},
            )
        if resp.is_success:
            return {"status": "ok", "message": "ElevenLabs is working!", "voice_id": voice_id, "audio_bytes": len(resp.content)}
        else:
            return {"status": "error", "http_status": resp.status_code, "detail": resp.text, "voice_id": voice_id}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(
    body: ChatRequest,
    current_user=Depends(get_current_user)
):
    """
    Interact with the role-based AI Assistant.
    """
    return await engine.handle_chat(body, current_user)

async def get_ws_current_user(token: str):
    if not token:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)
    try:
        payload = decode_access_token(token)
        user_id: str = payload.get("sub")
        if not user_id:
            raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)
    except JWTError:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)

    user = await db.user.find_unique(
        where={"id": int(user_id)},
        include={
            "role": True, 
            "userScopes": {
                "include": {
                    "cafe": True,
                    "branch": True
                }
            }
        },
    )

    if user is None:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)

    return user

import logging
logger = logging.getLogger(__name__)

@router.websocket("/ws")
async def websocket_chat(websocket: WebSocket, token: str):
    await websocket.accept()
    try:
        current_user = await get_ws_current_user(token)
        
        while True:
            data = await websocket.receive_json()
            messages_data = data.get("messages", [])
            messages = [ChatMessage(**msg) for msg in messages_data]
            request = ChatRequest(
                messages=messages,
                client_time=data.get("client_time"),
                timezone=data.get("timezone")
            )
            
            try:
                await engine.stream_chat(websocket, request, current_user)
            except Exception as stream_e:
                logger.error(f"Stream Error: {stream_e}", exc_info=True)
                await websocket.send_json({"chunk": f"\n\n**Error:** {str(stream_e)}"})
                await websocket.send_json({"done": True})
            
    except WebSocketException as e:
        await websocket.close(code=e.code)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WebSocket Loop Error: {e}", exc_info=True)
        try:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        except:
            pass
