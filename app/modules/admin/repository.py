from app.database import db

async def get_all_users():
    return await db.user.find_many(
        include={
            "role": True,
            "userScopes": {
                "include": {
                    "cafe": True,
                    "branch": True
                }
            }
        },
        order={"id": "asc"}
    )

async def update_user_role(user_id: int, role_id: int):
    return await db.user.update(
        where={"id": user_id},
        data={"roleId": role_id},
        include={"role": True}
    )

async def get_role_by_name(role_name: str):
    return await db.role.find_unique(where={"name": role_name})

async def get_user_scopes(user_id: int):
    return await db.userscope.find_many(where={"userId": user_id})

async def add_user_scope(user_id: int, cafe_id: int = None, branch_id: int = None):
    data = {"userId": user_id}
    if cafe_id:
        data["cafeId"] = cafe_id
    if branch_id:
        data["branchId"] = branch_id
    return await db.userscope.create(data=data)

async def remove_user_scope(scope_id: int):
    return await db.userscope.delete(where={"id": scope_id})

async def clear_user_branch_scopes(user_id: int):
    # Fetch and delete to safely clear all branch assignments
    scopes = await db.userscope.find_many(where={"userId": user_id})
    for s in scopes:
        if s.branchId is not None:
            await db.userscope.delete(where={"id": s.id})
