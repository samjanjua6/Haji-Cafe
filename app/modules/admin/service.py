from app.exceptions.custom_exceptions import NotFoundException, BadRequestException
from app.modules.admin import repository

async def get_all_users():
    return await repository.get_all_users()

async def update_user_role(user_id: int, role_name: str):
    role = await repository.get_role_by_name(role_name)
    if not role:
        raise NotFoundException(f"Role '{role_name}' not found.")
    return await repository.update_user_role(user_id, role.id)

async def add_user_scope(user_id: int, cafe_id: int = None, branch_id: int = None):
    if not cafe_id and not branch_id:
        raise BadRequestException("Must provide either cafe_id or branch_id")
        
    # User can only be assigned to ONE branch. Clear existing if branch_id is provided.
    if branch_id:
        await repository.clear_user_branch_scopes(user_id)
        
    return await repository.add_user_scope(user_id, cafe_id, branch_id)

async def remove_user_scope(scope_id: int):
    try:
        return await repository.remove_user_scope(scope_id)
    except Exception:
        raise NotFoundException("Scope not found.")
