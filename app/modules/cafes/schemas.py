from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# --- Cafe Schemas ---

class CafeCreate(BaseModel):
    name: str = Field(..., min_length=1)
    owner_id: Optional[int] = None


class CafeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)


class CafeResponse(BaseModel):
    id: int
    name: str
    owner_id: Optional[int] = Field(None, alias="ownerId")
    created_at: Optional[datetime] = Field(None, alias="createdAt")

    model_config = {"from_attributes": True, "populate_by_name": True}


# --- Branch Schemas ---

class BranchCreate(BaseModel):
    name: str = Field(..., min_length=1)
    location: Optional[str] = None


class BranchUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    location: Optional[str] = None


class BranchResponse(BaseModel):
    id: int
    cafe_id: int = Field(alias="cafeId")
    name: str
    location: Optional[str] = None
    created_at: Optional[datetime] = Field(None, alias="createdAt")

    model_config = {"from_attributes": True, "populate_by_name": True}
