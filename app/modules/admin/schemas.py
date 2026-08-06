from pydantic import BaseModel
from typing import Optional

class RoleUpdate(BaseModel):
    role_name: str

class ScopeCreate(BaseModel):
    cafe_id: Optional[int] = None
    branch_id: Optional[int] = None
