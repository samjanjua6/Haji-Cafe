from datetime import datetime
from typing import List, Optional
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


# --- Staff & Meeting Schemas ---

class StaffResponse(BaseModel):
    id: int
    email: str
    role: Optional[str] = None

    model_config = {"from_attributes": True, "populate_by_name": True}


class MeetingCreate(BaseModel):
    summary: str = Field(..., min_length=1, description="Meeting title")
    description: Optional[str] = None
    start_time: datetime = Field(..., description="Meeting start time (ISO 8601 with timezone)")
    end_time: datetime = Field(..., description="Meeting end time (ISO 8601 with timezone)")
    attendee_user_ids: List[int] = Field(..., min_length=1, description="List of staff user IDs to invite")
