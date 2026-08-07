from fastapi import APIRouter, Depends
from app.core.dependencies import get_current_user
from .schemas import ChatRequest, ChatResponse
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
