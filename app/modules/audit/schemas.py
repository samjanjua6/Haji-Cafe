# app/modules/audit/schemas.py
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class AuditLogResponse(BaseModel):
    id: int
    user_id: int
    action: str
    details: Optional[str] = None
    created_at: datetime
    cafe_id: Optional[int] = None
    branch_id: Optional[int] = None
    user_email: Optional[str] = None
    branch_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
