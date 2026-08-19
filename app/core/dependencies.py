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

    # Read-time RBAC filter: Exclude scopes tied to archived cafes
    filtered_scopes = []
    for scope in user.userScopes:
        cafe_is_archived = False
        
        # If it's a cafe-level scope, check the cafe
        if scope.cafe and scope.cafe.isArchived:
            cafe_is_archived = True
            
        # If it's a branch-level scope, check the branch's cafe
        if scope.branch and scope.branch.cafe and scope.branch.cafe.isArchived:
            cafe_is_archived = True
            
        if not cafe_is_archived:
            filtered_scopes.append(scope)
            
    user.userScopes = filtered_scopes

    return user
