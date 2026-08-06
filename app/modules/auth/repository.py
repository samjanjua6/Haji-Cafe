from typing import Optional

from app.database import db


async def find_user_by_email(email: str):
    return await db.user.find_unique(
        where={"email": email},
        include={"role": True},
    )


async def find_user_by_id(user_id: int):
    return await db.user.find_unique(
        where={"id": user_id},
        include={"role": True},
    )


async def find_user_by_provider_id(provider_id: str, provider: str):
    return await db.user.find_first(
        where={"authProviderId": provider_id, "authProvider": provider},
        include={"role": True},
    )


async def create_user(email: str, password_hash: Optional[str], auth_provider: str, auth_provider_id: Optional[str] = None):
    # Default role: STAFF (role_id=4)
    default_role = await db.role.find_first(where={"name": "STAFF"})
    return await db.user.create(
        data={
            "email": email,
            "passwordHash": password_hash,
            "authProvider": auth_provider,
            "authProviderId": auth_provider_id,
            "roleId": default_role.id,
        },
        include={"role": True},
    )


async def save_refresh_token(user_id: int, token_hash: str, expires_at):
    return await db.refreshtoken.create(
        data={
            "userId": user_id,
            "tokenHash": token_hash,
            "expiresAt": expires_at,
        }
    )


async def find_refresh_token(token_hash: str):
    return await db.refreshtoken.find_unique(
        where={"tokenHash": token_hash}
    )


async def revoke_refresh_token(token_hash: str):
    return await db.refreshtoken.update(
        where={"tokenHash": token_hash},
        data={"isRevoked": True},
    )


async def revoke_all_user_refresh_tokens(user_id: int):
    return await db.refreshtoken.update_many(
        where={"userId": user_id, "isRevoked": False},
        data={"isRevoked": True},
    )


async def update_google_tokens(user_id: int, access_token: Optional[str], refresh_token: Optional[str]):
    data = {}
    if access_token is not None:
        data["googleAccessToken"] = access_token
    if refresh_token is not None:
        data["googleRefreshToken"] = refresh_token
    if data:
        return await db.user.update(where={"id": user_id}, data=data)
