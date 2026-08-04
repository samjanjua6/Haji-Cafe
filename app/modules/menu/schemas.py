from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


# --- Master Menu Schemas ---

class MasterMenuItemCreate(BaseModel):
    name: str
    description: Optional[str] = None
    base_price: Decimal
    category_id: Optional[int] = None


class MasterMenuItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    base_price: Optional[Decimal] = None
    category_id: Optional[int] = None


class MasterMenuItemResponse(BaseModel):
    id: int
    cafe_id: int
    category_id: Optional[int]
    name: str
    description: Optional[str]
    base_price: Decimal
    is_deleted: bool

    model_config = {"from_attributes": True}


# --- Branch Menu Override Schemas ---

class BranchMenuItemCreate(BaseModel):
    master_item_id: int
    price_override: Optional[Decimal] = None
    is_in_stock: bool = True


class BranchMenuItemPatch(BaseModel):
    price_override: Optional[Decimal] = None
    is_in_stock: Optional[bool] = None
    is_active: Optional[bool] = None


class BranchMenuItemResponse(BaseModel):
    id: int
    branch_id: int
    master_item_id: int
    price_override: Optional[Decimal]
    is_in_stock: bool
    is_active: bool
    effective_price: Optional[Decimal] = None  # Computed: override ?? base_price

    model_config = {"from_attributes": True}
