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

        has_access = any(scope.cafeId == cafe_id for scope in current_user.userScopes)
        if not has_access:
            raise ForbiddenException("You do not have access to this café.")
        return current_user

    return cafe_access_checker


def require_branch_access():
    """
    Dependency factory that ensures BRANCH_MANAGER/STAFF can only access their own branch.
    SUPER_ADMIN bypasses this check.
    CAFE_OWNER must have a scope for the cafe that owns the branch.
    """
    async def branch_access_checker(branch_id: int, current_user=Depends(get_current_user)):
        if current_user.role.name == "SUPER_ADMIN":
            return current_user

        from app.modules.cafes.repository import get_branch_by_id
        branch = await get_branch_by_id(branch_id)
        if not branch:
            raise ForbiddenException("Branch not found or access denied.")

        if current_user.role.name == "CAFE_OWNER":
            has_access = any(scope.cafeId == branch.cafeId for scope in current_user.userScopes)
        else:
            has_access = any(scope.branchId == branch_id for scope in current_user.userScopes)
            
        if not has_access:
            raise ForbiddenException("You do not have access to this branch.")
        return current_user

    return branch_access_checker
