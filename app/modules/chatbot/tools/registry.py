from app.core.exceptions import UnauthorizedException
from app.database import db

from .cafe_tools import build_cafe_tools
from .inventory_tools import build_inventory_tools
from .order_tools import build_order_tools

def build_tools(current_user, agent_type: str = "all"):
    """
    Returns a list of tool functions bound to the current_user's context.
    Combines tools from all specialists based on the user's role and the requested agent type.
    """
    role = current_user.role.name
    
    # Authorized scopes
    authorized_cafes = {scope.cafeId for scope in current_user.userScopes if scope.cafeId is not None}
    authorized_branches = {scope.branchId for scope in current_user.userScopes if scope.branchId is not None}

    async def _check_cafe_access(cafe_id: int):
        if role == "SUPER_ADMIN": return
        if cafe_id not in authorized_cafes:
            raise UnauthorizedException(f"Access denied to cafe {cafe_id}.")

    async def _check_branch_access(branch_id: int):
        if role == "SUPER_ADMIN": return
        if role == "CAFE_OWNER":
            branch = await db.branch.find_unique(where={"id": branch_id})
            if not branch or branch.cafeId not in authorized_cafes:
                raise UnauthorizedException(f"Access denied to branch {branch_id}.")
            return
        if branch_id not in authorized_branches:
            raise UnauthorizedException(f"Access denied to branch {branch_id}.")

    tools = []
    
    if agent_type in ["all", "cafe"]:
        tools.extend(build_cafe_tools(current_user, authorized_cafes, _check_cafe_access))
        
    if agent_type in ["all", "inventory"]:
        tools.extend(build_inventory_tools(current_user, _check_cafe_access, _check_branch_access))
        
    if agent_type in ["all", "order"]:
        tools.extend(build_order_tools(current_user, _check_branch_access))
        
    return tools
