from typing import List, Optional

from app.database import db


async def get_branch_menu_items_by_ids(branch_id: int, item_ids: List[int]):
    """Fetch branch menu items by IDs, scoped to a specific branch."""
    return await db.branchmenuitem.find_many(
        where={"id": {"in": item_ids}, "branchId": branch_id},
        include={"masterItem": True},
    )


async def create_order(branch_id: int, user_id: Optional[int], total_amount, items_data: list):
    """Create an order and deduct inventory in a single atomic transaction."""
    async with db.tx() as transaction:
        # Create order
        order = await transaction.order.create(
            data={
                "branchId": branch_id,
                "createdByUserId": user_id,
                "totalAmount": total_amount,
                "orderItems": {
                    "create": items_data,
                },
            },
            include={"orderItems": True},
        )
        
        # Deduct inventory
        for data in items_data:
            item_id = data["branchMenuItemId"]
            qty = data["quantity"]
            
            branch_item = await transaction.branchmenuitem.find_unique(where={"id": item_id})
            if branch_item.availableQuantity is not None:
                new_qty = branch_item.availableQuantity - qty
                if new_qty < 0:
                    # Should be caught by validation in service, but this is a DB-level safeguard
                    raise ValueError(f"Insufficient stock for item ID {item_id}")
                    
                update_data = {"availableQuantity": new_qty}
                if new_qty == 0:
                    update_data["isInStock"] = False
                    
                await transaction.branchmenuitem.update(
                    where={"id": item_id},
                    data=update_data
                )
                
        return order


async def get_orders_by_branch(branch_id: int):
    return await db.order.find_many(
        where={"branchId": branch_id},
        order={"createdAt": "desc"},
    )


async def get_order_by_id(order_id: int):
    return await db.order.find_unique(
        where={"id": order_id},
        include={
            "orderItems": {
                "include": {
                    "branchMenuItem": {
                        "include": {
                            "masterItem": True
                        }
                    }
                }
            }
        },
    )


async def update_order_status(order_id: int, new_status: str):
    return await db.order.update(
        where={"id": order_id},
        data={"status": new_status},
        include={"orderItems": True},
    )


async def get_orders_by_cafe(cafe_id: int):
    """Fetch all orders across all branches of a café."""
    return await db.order.find_many(
        where={"branch": {"cafeId": cafe_id}},
        include={"branch": True},
        order={"createdAt": "desc"},
    )
