from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class ParsedOrderItem(BaseModel):
    name: str
    quantity: int = Field(default=1, ge=1)
    notes: Optional[str] = None


class ParsedWhatsAppOrder(BaseModel):
    intent: str = "ORDER"  # ORDER, CANCEL_ORDER, QUEUE_STATUS, MY_ORDER_STATUS, MENU_INQUIRY, RECOMMENDATION, STORE_INFO, HELP
    customer_name: Optional[str] = None
    branch_id: int = 1
    items: List[ParsedOrderItem] = []
    order_id_reference: Optional[int] = None
    inquiry_topic: Optional[str] = None


class WhatsAppSimulationRequest(BaseModel):
    message: str = Field(..., description="Customer natural language order, e.g. 'Can I get 2 Spanish Lattes and 1 Butter Croissant?'")
    customer_name: Optional[str] = Field(default="Sam Janjua", description="Customer display name")
    customer_phone: Optional[str] = Field(default="+923001234567", description="Customer phone number")
    branch_id: Optional[int] = Field(default=1, description="Target branch ID")


class WhatsAppOrderResponse(BaseModel):
    status: str
    order_id: Optional[int] = None
    branch_id: int
    total_amount: Optional[float] = None
    items_placed: List[Dict[str, Any]] = []
    reply_message: str
    buttons: Optional[List[Dict[str, str]]] = None
    prep_time_minutes: int = 10
