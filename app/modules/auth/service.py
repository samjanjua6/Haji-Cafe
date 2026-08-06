from datetime import datetime, timezone
from typing import Optional

import httpx

from app.config import settings
from app.core.exceptions import BadRequestException, ConflictException, UnauthorizedException
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.modules.auth import repository

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


# --- Auth Service Functions ---

async def register(email: str, password: str):
    existing = await repository.find_user_by_email(email)
    if existing:
        raise ConflictException("Email already registered.")

    password_hash = hash_password(password)
    user = await repository.create_user(email, password_hash, "LOCAL")
    return await _issue_tokens(user)


async def login(email: str, password: str):
    user = await repository.find_user_by_email(email)
    if not user or user.passwordHash is None:
        raise UnauthorizedException("Invalid credentials.")
    if not verify_password(password, user.passwordHash):
        raise UnauthorizedException("Invalid credentials.")
    return await _issue_tokens(user)


async def refresh(raw_refresh_token: str):
    token_hash = hash_token(raw_refresh_token)
    stored = await repository.find_refresh_token(token_hash)

    if not stored or stored.isRevoked or stored.expiresAt < datetime.now(timezone.utc):
        raise UnauthorizedException("Invalid or expired refresh token.")

    # Rotate: revoke old token, issue new pair
    await repository.revoke_refresh_token(token_hash)
    user = await repository.find_user_by_id(stored.userId)
    return await _issue_tokens(user)


async def logout(raw_refresh_token: str):
    token_hash = hash_token(raw_refresh_token)
    await repository.revoke_refresh_token(token_hash)


async def get_google_auth_url() -> str:
    params = (
        f"client_id={settings.GOOGLE_CLIENT_ID}"
        f"&redirect_uri={settings.GOOGLE_REDIRECT_URI}"
        f"&response_type=code"
        f"&scope=openid email profile https://www.googleapis.com/auth/calendar.events"
        f"&access_type=offline"
        f"&prompt=consent"
    )
    return f"https://accounts.google.com/o/oauth2/v2/auth?{params}"


async def handle_google_callback(code: str):
    async with httpx.AsyncClient() as client:
        # Exchange code for Google tokens
        token_resp = await client.post(GOOGLE_TOKEN_URL, data={
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        })
        token_data = token_resp.json()
        if "error" in token_data:
            raise BadRequestException("Google OAuth failed.")

        # Fetch user info from Google
        userinfo_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
        )
        userinfo = userinfo_resp.json()

    google_id = userinfo.get("sub")
    email = userinfo.get("email")

    if not google_id or not email:
        raise BadRequestException("Could not retrieve user info from Google.")

    google_access_token = token_data.get("access_token")
    google_refresh_token = token_data.get("refresh_token")

    # Upsert: find by google_id, or create new
    user = await repository.find_user_by_provider_id(google_id, "GOOGLE")
    if not user:
        existing_email_user = await repository.find_user_by_email(email)
        if existing_email_user:
            user = await repository.link_google_account(existing_email_user.id, google_id)
        else:
            user = await repository.create_user(email, None, "GOOGLE", google_id)

    # Save Google tokens to user record for Calendar API use
    await repository.update_google_tokens(user.id, google_access_token, google_refresh_token)

    return await _issue_tokens(user)


async def _issue_tokens(user) -> dict:
    """Internal helper: create access + refresh token pair and persist refresh token."""
    access_token = create_access_token(user.id)
    raw_refresh, hashed_refresh, expires_at = create_refresh_token()
    await repository.save_refresh_token(user.id, hashed_refresh, expires_at)
    return {
        "access_token": access_token,
        "refresh_token": raw_refresh,
        "token_type": "bearer",
    }
