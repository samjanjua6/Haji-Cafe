from typing import Optional
from app.database import db


# --- Cafe Repository ---

async def create_cafe(name: str, owner_id: Optional[int]):
    data = {"name": name, "ownerId": owner_id}
    if owner_id:
        data["userScopes"] = {"create": [{"userId": owner_id}]}
    return await db.cafe.create(data=data)


async def get_all_cafes():
    return await db.cafe.find_many(include={"branches": True})


async def get_cafes_by_owner(owner_id: int):
    # Find all cafes where the user has a UserScope
    scopes = await db.userscope.find_many(
        where={"userId": owner_id},
        include={"cafe": {"include": {"branches": True}}}
    )
    
    seen = set()
    cafes = []
    for s in scopes:
        if s.cafe and s.cafe.id not in seen:
            seen.add(s.cafe.id)
            cafes.append(s.cafe)
            
    # Also check ownerId as a fallback
    owned_cafes = await db.cafe.find_many(
        where={"ownerId": owner_id},
        include={"branches": True}
    )
    
    for c in owned_cafes:
        if c.id not in seen:
            seen.add(c.id)
            cafes.append(c)
            
    return cafes


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


# --- Staff Repository ---

async def get_staff_by_cafe(cafe_id: int):
    """
    Returns all users who have a UserScope connected to this cafe (directly or via a branch).
    Excludes the cafe owner themselves.
    """
    cafe_branches = await db.branch.find_many(where={"cafeId": cafe_id})
    branch_ids = [b.id for b in cafe_branches]

    # Find all user_scope records for this cafe or any of its branches
    scopes = await db.userscope.find_many(
        where={
            "OR": [
                {"cafeId": cafe_id},
                {"branchId": {"in": branch_ids}} if branch_ids else {},
            ]
        },
        include={"user": {"include": {"role": True}}},
    )

    # Deduplicate by user id (a user may have multiple scopes)
    seen = set()
    staff = []
    for scope in scopes:
        if scope.user and scope.userId not in seen:
            seen.add(scope.userId)
            staff.append(scope.user)
    return staff


async def get_users_by_ids(user_ids: list):
    return await db.user.find_many(where={"id": {"in": user_ids}})
