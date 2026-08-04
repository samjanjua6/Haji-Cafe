from typing import Optional
from app.core.exceptions import NotFoundException, BadRequestException
from prisma.errors import ForeignKeyViolationError
from app.modules.cafes import repository


# --- Cafe Service ---

async def create_cafe(name: str, owner_id: Optional[int]):
    return await repository.create_cafe(name, owner_id)


async def get_all_cafes():
    return await repository.get_all_cafes()


async def get_cafe(cafe_id: int):
    cafe = await repository.get_cafe_by_id(cafe_id)
    if not cafe:
        raise NotFoundException("Café not found.")
    return cafe


async def update_cafe(cafe_id: int, name: Optional[str]):
    await get_cafe(cafe_id)  # Ensure it exists
    if name is not None:
        return await repository.update_cafe(cafe_id, name)
    return await repository.get_cafe_by_id(cafe_id)


async def delete_cafe(cafe_id: int):
    await get_cafe(cafe_id)
    try:
        return await repository.delete_cafe(cafe_id)
    except ForeignKeyViolationError:
        raise BadRequestException("Cannot delete café because it has existing branches or orders.")


# --- Branch Service ---

async def create_branch(cafe_id: int, name: str, location: Optional[str]):
    await get_cafe(cafe_id)  # Ensure parent cafe exists
    return await repository.create_branch(cafe_id, name, location)


async def get_branches(cafe_id: int):
    await get_cafe(cafe_id)
    return await repository.get_branches_by_cafe(cafe_id)


async def update_branch(cafe_id: int, branch_id: int, data: dict):
    branch = await repository.get_branch_by_id(branch_id)
    if not branch or branch.cafeId != cafe_id:
        raise NotFoundException("Branch not found in this café.")
    clean_data = {k: v for k, v in data.items() if v is not None}
    return await repository.update_branch(branch_id, clean_data)


async def delete_branch(cafe_id: int, branch_id: int):
    branch = await repository.get_branch_by_id(branch_id)
    if not branch or branch.cafeId != cafe_id:
        raise NotFoundException("Branch not found in this café.")
    try:
        return await repository.delete_branch(branch_id)
    except ForeignKeyViolationError:
        raise BadRequestException("Cannot delete branch because it has existing orders.")
