from fastapi import APIRouter, Depends, status
from app.middleware.rbac import require_role
from app.modules.admin import service
from app.modules.admin.schemas import RoleUpdate, ScopeCreate
from app.utils.serializer import prisma_to_dict

router = APIRouter()

@router.get("/users")
async def list_users(_=Depends(require_role("SUPER_ADMIN"))):
    """[SUPER_ADMIN] List all users with their roles and scopes."""
    return prisma_to_dict(await service.get_all_users())

@router.put("/users/{user_id}/role")
async def update_user_role(user_id: int, body: RoleUpdate, current_user=Depends(require_role("SUPER_ADMIN"))):
    """[SUPER_ADMIN] Update a user's role."""
    return prisma_to_dict(await service.update_user_role(user_id, body.role_name, current_user.id))

@router.post("/users/{user_id}/scopes", status_code=status.HTTP_201_CREATED)
async def add_user_scope(user_id: int, body: ScopeCreate, _=Depends(require_role("SUPER_ADMIN"))):
    """[SUPER_ADMIN] Assign a user to a cafe or branch."""
    return prisma_to_dict(await service.add_user_scope(user_id, body.cafe_id, body.branch_id))

@router.delete("/users/{user_id}/scopes/{scope_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_user_scope(user_id: int, scope_id: int, _=Depends(require_role("SUPER_ADMIN"))):
    """[SUPER_ADMIN] Remove a user's scope assignment."""
    await service.remove_user_scope(scope_id)
