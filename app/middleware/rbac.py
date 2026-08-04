from fastapi import Depends

from app.core.dependencies import get_current_user
from app.core.exceptions import ForbiddenException


def require_role(*allowed_roles: str):
    """
    Dependency factory that enforces Role-Based Access Control.

    Usage:
        @router.get("/admin-only")
        async def admin_route(user = Depends(require_role("SUPER_ADMIN"))):
            ...
    """
    async def role_checker(current_user=Depends(get_current_user)):
        if current_user.role.name not in allowed_roles:
            raise ForbiddenException(
                f"Access denied. Required roles: {list(allowed_roles)}"
            )
        return current_user

    return role_checker


def require_cafe_access():
    """
    Dependency factory that ensures a CAFE_OWNER can only access their own cafe.
    SUPER_ADMIN bypasses this check.
    """
    async def cafe_access_checker(cafe_id: int, current_user=Depends(get_current_user)):
        if current_user.role.name == "SUPER_ADMIN":
            return current_user

        has_access = any(scope.cafe_id == cafe_id for scope in current_user.userScopes)
        if not has_access:
            raise ForbiddenException("You do not have access to this café.")
        return current_user

    return cafe_access_checker


def require_branch_access():
    """
    Dependency factory that ensures BRANCH_MANAGER/STAFF can only access their own branch.
    SUPER_ADMIN and CAFE_OWNER bypass this check.
    """
    async def branch_access_checker(branch_id: int, current_user=Depends(get_current_user)):
        if current_user.role.name in ("SUPER_ADMIN", "CAFE_OWNER"):
            return current_user

        has_access = any(scope.branch_id == branch_id for scope in current_user.userScopes)
        if not has_access:
            raise ForbiddenException("You do not have access to this branch.")
        return current_user

    return branch_access_checker
