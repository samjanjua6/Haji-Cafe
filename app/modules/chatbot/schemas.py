from pydantic import BaseModel
from typing import List, Optional, Any, Dict

class ChatMessage(BaseModel):
    role: str # "user", "assistant", or "model" (Gemini API uses "model")
    content: str
    tool_calls: Optional[List[Dict[str, Any]]] = None # For tool calls (optional for frontend representation)

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

class ChatResponse(BaseModel):
    messages: List[ChatMessage]
