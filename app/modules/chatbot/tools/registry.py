from app.core.exceptions import UnauthorizedException
from app.database import db

from .cafe_tools import build_cafe_tools
from .inventory_tools import build_inventory_tools
from .order_tools import build_order_tools
from .business_tools import build_business_tools

def build_tools(current_user, agent_type: str = "all"):
    """
    Returns a list of tool functions bound to the current_user's context.
    Combines tools from all specialists based on the user's role and the requested agent type.
    """
    role = current_user.role.name
    
    # Authorized scopes (resolve from userScopes and ownedCafes)
    authorized_cafes = {scope.cafeId for scope in (current_user.userScopes or []) if scope.cafeId is not None}
    if hasattr(current_user, "ownedCafes") and current_user.ownedCafes:
        for c in current_user.ownedCafes:
            if not getattr(c, "isArchived", False):
                authorized_cafes.add(c.id)
    authorized_branches = {scope.branchId for scope in (current_user.userScopes or []) if scope.branchId is not None}

    async def _check_cafe_access(cafe_id: int):
        if role == "SUPER_ADMIN":
            return
        if cafe_id in authorized_cafes:
            return
        # Database fallback check
        cafe = await db.cafe.find_unique(where={"id": cafe_id})
        if cafe and cafe.ownerId == current_user.id and not cafe.isArchived:
            authorized_cafes.add(cafe_id)
            return
        raise UnauthorizedException(f"Access denied to cafe {cafe_id}.")

    async def _check_branch_access(branch_id: int):
        if role == "SUPER_ADMIN":
            return
        if branch_id in authorized_branches:
            return
        branch = await db.branch.find_unique(where={"id": branch_id}, include={"cafe": True})
        if not branch:
            raise UnauthorizedException(f"Branch {branch_id} not found.")
        if role == "CAFE_OWNER":
            if branch.cafeId in authorized_cafes or (branch.cafe and branch.cafe.ownerId == current_user.id and not branch.cafe.isArchived):
                authorized_branches.add(branch_id)
                return
        raise UnauthorizedException(f"Access denied to branch {branch_id}.")

    tools = []
    
    if agent_type in ["all", "cafe"]:
        tools.extend(build_cafe_tools(current_user, authorized_cafes, _check_cafe_access))
        
    if agent_type in ["all", "inventory"]:
        tools.extend(build_inventory_tools(current_user, _check_cafe_access, _check_branch_access))
        
    if agent_type in ["all", "order"]:
        tools.extend(build_order_tools(current_user, _check_branch_access))

    if agent_type in ["all", "business"]:
        tools.extend(build_business_tools(current_user, _check_cafe_access, _check_branch_access))
        
    return tools
