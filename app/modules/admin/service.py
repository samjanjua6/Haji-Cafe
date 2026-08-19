from app.core.exceptions import NotFoundException, BadRequestException
from app.modules.admin import repository

async def get_all_users():
    return await repository.get_all_users()

async def update_user_role(user_id: int, role_name: str, current_user_id: int):
    if user_id == current_user_id:
        # A user cannot change their own role. Especially blocking self-demotion from SUPER_ADMIN.
        raise BadRequestException("You cannot change your own role. Another administrator must perform this action, or direct database intervention is required.")

    role = await repository.get_role_by_name(role_name)
    if not role:
        raise NotFoundException(f"Role '{role_name}' not found.")
        
    try:
        return await repository.update_user_role_atomic(user_id, role.id, current_user_id)
    except Exception as e:
        if str(e) == "Cannot demote the last SUPER_ADMIN.":
            raise BadRequestException(str(e))
        raise BadRequestException(f"Failed to update role: {str(e)}")

async def add_user_scope(user_id: int, cafe_id: int = None, branch_id: int = None):
    if not cafe_id and not branch_id:
        raise BadRequestException("Must provide either cafe_id or branch_id")
    if cafe_id and branch_id:
        raise BadRequestException("Cannot provide BOTH Cafe ID and Branch ID. A user scope must be for EITHER an entire Cafe OR a specific Branch, not both.")
        
    try:
        if branch_id:
            await repository.clear_user_branch_scopes(user_id)
            
        return await repository.add_user_scope(user_id, cafe_id, branch_id)
    except Exception as e:
        raise BadRequestException(f"Failed to assign scope: {str(e)}")

async def remove_user_scope(scope_id: int):
    try:
        return await repository.remove_user_scope(scope_id)
    except Exception:
        raise NotFoundException("Scope not found.")
