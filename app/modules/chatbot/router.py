from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, WebSocketException, status
from app.core.dependencies import get_current_user
from app.core.security import decode_access_token
from app.database import db
from jose import JWTError
from .schemas import ChatRequest, ChatResponse, ChatMessage
from . import service

router = APIRouter(prefix="/chatbot", tags=["chatbot"])

@router.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(
    body: ChatRequest,
    current_user=Depends(get_current_user)
):
    """
    Interact with the role-based AI Assistant.
    """
    return await service.handle_chat(body, current_user)

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
            request = ChatRequest(messages=messages)
            
            try:
                await service.stream_chat(websocket, request, current_user)
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
