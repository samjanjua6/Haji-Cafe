from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError

from app.core.exceptions import UnauthorizedException
from app.core.security import decode_access_token
from app.database import db

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    """
    Shared FastAPI dependency: decodes the JWT Bearer token and returns
    the authenticated user with their role and scopes.
    Import this from core.dependencies across any module that needs auth.
    """
    try:
        payload = decode_access_token(credentials.credentials)
        user_id: str = payload.get("sub")
        if not user_id:
            raise UnauthorizedException()
    except JWTError:
        raise UnauthorizedException()

    user = await db.user.find_unique(
        where={"id": int(user_id)},
        include={
            "role": True, 
            "userScopes": {
                "include": {
                    "cafe": True,
                    "branch": True
                }
            }
        },
    )

    if user is None:
        raise UnauthorizedException()

    return user
