from typing import Optional

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
