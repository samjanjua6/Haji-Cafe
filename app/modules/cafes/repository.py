from typing import Optional
from app.database import db


# --- Cafe Repository ---

async def create_cafe(name: str, owner_id: Optional[int]):
    return await db.cafe.create(data={"name": name, "ownerId": owner_id})


async def get_all_cafes():
    return await db.cafe.find_many(include={"branches": True})


async def get_cafe_by_id(cafe_id: int):
    return await db.cafe.find_unique(
        where={"id": cafe_id},
        include={"branches": True},
    )


async def update_cafe(cafe_id: int, name: str):
    return await db.cafe.update(where={"id": cafe_id}, data={"name": name})


async def delete_cafe(cafe_id: int):
    return await db.cafe.delete(where={"id": cafe_id})


# --- Branch Repository ---

async def create_branch(cafe_id: int, name: str, location: Optional[str]):
    return await db.branch.create(data={"cafeId": cafe_id, "name": name, "location": location})


async def get_branches_by_cafe(cafe_id: int):
    return await db.branch.find_many(where={"cafeId": cafe_id})


async def get_branch_by_id(branch_id: int):
    return await db.branch.find_unique(where={"id": branch_id})


async def update_branch(branch_id: int, data: dict):
    return await db.branch.update(where={"id": branch_id}, data=data)


async def delete_branch(branch_id: int):
    return await db.branch.delete(where={"id": branch_id})
