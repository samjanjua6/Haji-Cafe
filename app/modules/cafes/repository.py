from typing import Optional
from app.database import db


# --- Cafe Repository ---

async def create_cafe(name: str, owner_id: Optional[int]):
    data = {"name": name, "ownerId": owner_id}
    if owner_id:
        data["userScopes"] = {"create": [{"userId": owner_id}]}
    return await db.cafe.create(data=data)


async def get_all_cafes(include_archived: bool = False):
    where_clause = {} if include_archived else {"isArchived": False}
    return await db.cafe.find_many(where=where_clause, include={"branches": True})


async def get_cafes_by_owner(owner_id: int, include_archived: bool = False):
    # Find all cafes where the user has a UserScope
    scopes = await db.userscope.find_many(
        where={"userId": owner_id},
        include={"cafe": {"include": {"branches": True}}}
    )
    
    seen = set()
    cafes = []
    for s in scopes:
        if s.cafe and s.cafe.id not in seen:
            if not include_archived and s.cafe.isArchived:
                continue
            seen.add(s.cafe.id)
            cafes.append(s.cafe)
            
    # Also check ownerId as a fallback
    where_clause = {"ownerId": owner_id}
    if not include_archived:
        where_clause["isArchived"] = False
    owned_cafes = await db.cafe.find_many(
        where=where_clause,
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


async def get_cafe_impact(cafe_id: int):
    branches_count = await db.branch.count(where={"cafeId": cafe_id})
    staff = await get_staff_by_cafe(cafe_id)
    staff_count = len(staff)
    menu_items_count = await db.mastermenuitem.count(where={"cafeId": cafe_id})
    
    branches = await db.branch.find_many(where={"cafeId": cafe_id})
    branch_ids = [b.id for b in branches]
    if branch_ids:
        orders_count = await db.order.count(where={"branchId": {"in": branch_ids}})
        active_orders_count = await db.order.count(where={"branchId": {"in": branch_ids}, "status": {"in": ["PENDING", "IN_PREPARATION"]}})
    else:
        orders_count = 0
        active_orders_count = 0

    return {
        "branches": branches_count,
        "staff": staff_count,
        "menuItems": menu_items_count,
        "orders": orders_count,
        "activeOrders": active_orders_count
    }


async def archive_cafe(cafe_id: int, user_id: int, impact_counts: dict, cafe_name: str):
    async with db.tx() as transaction:
        branches = await transaction.branch.find_many(where={"cafeId": cafe_id})
        branch_ids = [b.id for b in branches]
        if branch_ids:
            active_orders = await transaction.order.count(
                where={"branchId": {"in": branch_ids}, "status": {"in": ["PENDING", "IN_PREPARATION"]}}
            )
            if active_orders > 0:
                raise Exception("Cannot archive cafe while there are active orders in progress.")
                
        await transaction.cafe.update(where={"id": cafe_id}, data={"isArchived": True})
        
        details = f"Archived cafe '{cafe_name}'. Impact: {impact_counts['branches']} branches, {impact_counts['staff']} staff, {impact_counts['menuItems']} menu items, {impact_counts['orders']} historical orders."
        await transaction.auditlog.create(data={
            "userId": user_id,
            "action": "CAFE_ARCHIVED",
            "details": details
        })


async def restore_cafe(cafe_id: int, user_id: int, cafe_name: str):
    async with db.tx() as transaction:
        await transaction.cafe.update(where={"id": cafe_id}, data={"isArchived": False})
        await transaction.auditlog.create(data={
            "userId": user_id,
            "action": "CAFE_RESTORED",
            "details": f"Restored cafe '{cafe_name}'."
        })


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
