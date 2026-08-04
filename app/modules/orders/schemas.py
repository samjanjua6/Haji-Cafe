from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


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
    quantity: int = Field(..., gt=0)
    notes: Optional[str] = None


class OrderCreate(BaseModel):
    items: List[OrderItemCreate] = Field(..., min_length=1)


class OrderStatusUpdate(BaseModel):
    status: OrderStatusEnum


# --- Response Schemas ---

class MasterItemSubset(BaseModel):
    name: str

class BranchMenuItemSubset(BaseModel):
    masterItem: Optional[MasterItemSubset] = None

    model_config = {"from_attributes": True, "populate_by_name": True}

class OrderItemResponse(BaseModel):
    id: int
    branch_menu_item_id: int = Field(alias="branchMenuItemId")
    quantity: int
    price_at_purchase: Decimal = Field(alias="priceAtPurchase")
    notes: Optional[str] = None
    branchMenuItem: Optional[BranchMenuItemSubset] = None

    model_config = {"from_attributes": True, "populate_by_name": True}


class OrderResponse(BaseModel):
    id: int
    branch_id: int = Field(alias="branchId")
    created_by_user_id: Optional[int] = Field(None, alias="createdByUserId")
    status: OrderStatusEnum
    total_amount: Decimal = Field(alias="totalAmount")
    created_at: Optional[datetime] = Field(None, alias="createdAt")
    items: Optional[List[OrderItemResponse]] = Field(None, alias="orderItems")

    model_config = {"from_attributes": True, "populate_by_name": True}
