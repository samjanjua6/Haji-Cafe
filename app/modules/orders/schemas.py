from decimal import Decimal
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel


class OrderStatusEnum(str, Enum):
    PENDING = "PENDING"
    IN_PREPARATION = "IN_PREPARATION"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


# Valid state machine transitions
VALID_TRANSITIONS = {
    OrderStatusEnum.PENDING: [OrderStatusEnum.IN_PREPARATION],
    OrderStatusEnum.IN_PREPARATION: [OrderStatusEnum.COMPLETED, OrderStatusEnum.CANCELLED],
    OrderStatusEnum.COMPLETED: [],   # Terminal
    OrderStatusEnum.CANCELLED: [],   # Terminal
}


# --- Request Schemas ---

class OrderItemCreate(BaseModel):
    branch_menu_item_id: int
    quantity: int
    notes: Optional[str] = None


class OrderCreate(BaseModel):
    items: List[OrderItemCreate]


class OrderStatusUpdate(BaseModel):
    status: OrderStatusEnum


# --- Response Schemas ---

class OrderItemResponse(BaseModel):
    id: int
    branch_menu_item_id: int
    quantity: int
    price_at_purchase: Decimal
    notes: Optional[str]

    model_config = {"from_attributes": True}


class OrderResponse(BaseModel):
    id: int
    branch_id: int
    created_by_user_id: Optional[int]
    status: OrderStatusEnum
    total_amount: Decimal
    items: Optional[List[OrderItemResponse]] = None

    model_config = {"from_attributes": True}
