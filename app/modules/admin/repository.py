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

async def update_user_role_atomic(user_id: int, new_role_id: int, acting_user_id: int):
    async with db.tx() as transaction:
        # Lock SUPER_ADMIN role row explicitly
        admin_role_rows = await transaction.query_raw(
            "SELECT id FROM roles WHERE name = 'SUPER_ADMIN' FOR UPDATE"
        )
        if not admin_role_rows:
            raise Exception("SUPER_ADMIN role not found.")
        admin_role_id = admin_role_rows[0]['id']

        target_user = await transaction.user.find_unique(
            where={"id": user_id},
            include={"role": True, "userScopes": True}
        )
        if not target_user:
            raise Exception("User not found.")

        old_role_name = target_user.role.name
        new_role_row = await transaction.role.find_unique(where={"id": new_role_id})
        new_role_name = new_role_row.name

        if old_role_name == "SUPER_ADMIN" and new_role_name != "SUPER_ADMIN":
            # Safely check count while holding the lock
            admin_count = await transaction.user.count(
                where={'roleId': admin_role_id}
            )
            if admin_count <= 1:
                raise Exception("Cannot demote the last SUPER_ADMIN.")

        # Determine if scopes need clearing
        branch_tier_roles = ["STAFF", "BRANCH_MANAGER"]
        cleared_scopes_text = ""
        
        if old_role_name != new_role_name:
            if old_role_name in branch_tier_roles and new_role_name in branch_tier_roles:
                pass # Preserve
            else:
                if target_user.userScopes:
                    cleared_scopes_text = "; cleared previous assignments"
                    await transaction.userscope.delete_many(where={"userId": user_id})

        updated_user = await transaction.user.update(
            where={"id": user_id},
            data={"roleId": new_role_id},
            include={
                "role": True,
                "userScopes": {
                    "include": {
                        "cafe": True,
                        "branch": True
                    }
                }
            }
        )

        if old_role_name != new_role_name:
            details = f"Changed role from {old_role_name} to {new_role_name}{cleared_scopes_text}"
            await transaction.auditlog.create(
                data={
                    "userId": acting_user_id,
                    "action": "ROLE_CHANGED",
                    "details": f"Target user ID {user_id}: {details}"
                }
            )

        return updated_user

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
