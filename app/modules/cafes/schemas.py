from typing import Optional
from pydantic import BaseModel


# --- Cafe Schemas ---

class CafeCreate(BaseModel):
    name: str
    owner_id: Optional[int] = None


class CafeUpdate(BaseModel):
    name: Optional[str] = None


class CafeResponse(BaseModel):
    id: int
    name: str
    owner_id: Optional[int]

    model_config = {"from_attributes": True}


# --- Branch Schemas ---

class BranchCreate(BaseModel):
    name: str
    location: Optional[str] = None


class BranchUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None


class BranchResponse(BaseModel):
    id: int
    cafe_id: int
    name: str
    location: Optional[str]

    model_config = {"from_attributes": True}
