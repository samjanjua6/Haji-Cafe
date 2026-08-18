from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


# --- Master Menu Schemas ---

class MasterMenuItemCreate(BaseModel):
    name: str = Field(..., min_length=1)
    description: Optional[str] = None
    base_price: Decimal = Field(..., gt=0)
    category_id: Optional[int] = None


class MasterMenuItemUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    description: Optional[str] = None
    base_price: Optional[Decimal] = Field(None, gt=0)
    category_id: Optional[int] = None


class MasterMenuItemResponse(BaseModel):
    id: int
    cafe_id: int = Field(alias="cafeId")
    category_id: Optional[int] = Field(None, alias="categoryId")
    name: str
    description: Optional[str] = None
    base_price: Decimal = Field(alias="basePrice")
    is_deleted: bool = Field(alias="isDeleted")

    model_config = {"from_attributes": True, "populate_by_name": True}


# --- Branch Menu Override Schemas ---

class BranchMenuItemCreate(BaseModel):
    master_item_id: int
    price_override: Optional[Decimal] = Field(None, gt=0)
    available_quantity: Optional[int] = Field(None, ge=0)
    is_in_stock: bool = True
    is_active: bool = True


class MasterItemSubset(BaseModel):
    id: int
    name: str
    base_price: Decimal = Field(alias="basePrice")

    model_config = {"from_attributes": True, "populate_by_name": True}


class BranchMenuItemPatch(BaseModel):
    price_override: Optional[Decimal] = Field(None, gt=0)
    available_quantity: Optional[int] = Field(None, ge=0)
    is_in_stock: Optional[bool] = None
    is_active: Optional[bool] = None

class BranchMenuItemResponse(BaseModel):
    id: int
    branch_id: int = Field(alias="branchId")
    master_item_id: int = Field(alias="masterItemId")
    price_override: Optional[Decimal] = Field(None, alias="priceOverride")
    available_quantity: Optional[int] = Field(None, alias="availableQuantity")
    is_in_stock: bool = Field(alias="isInStock")
    is_active: bool = Field(alias="isActive")
    low_stock_threshold: int = Field(alias="lowStockThreshold")
    effective_price: Optional[Decimal] = None  # Computed: override ?? base_price
    masterItem: Optional[MasterItemSubset] = None

    model_config = {"from_attributes": True, "populate_by_name": True}

class StockUpdateRequest(BaseModel):
    available_quantity: Optional[int] = Field(None, alias="availableQuantity", ge=0)
    is_in_stock: Optional[bool] = Field(None, alias="isInStock")
    reason: str
    note: Optional[str] = None

class ThresholdUpdateRequest(BaseModel):
    low_stock_threshold: int = Field(..., alias="lowStockThreshold", ge=0)
