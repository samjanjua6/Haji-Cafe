from typing import Optional

# pyrefly: ignore [missing-import]
from pydantic import BaseModel, EmailStr


# --- Request Schemas ---

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class UpdateMeRequest(BaseModel):
    displayName: Optional[str] = None
    timezone: Optional[str] = None
    defaultCafeId: Optional[int] = None
    defaultBranchId: Optional[int] = None
    preferences: Optional[dict] = None


class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str


# --- Response Schemas ---

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    auth_provider: str

    model_config = {"from_attributes": True}


class MeResponse(BaseModel):
    id: int
    email: str
    role: str
    auth_provider: str
