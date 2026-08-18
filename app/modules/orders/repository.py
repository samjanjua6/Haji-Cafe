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
        
        # Deduct inventory atomically with gte guard
        for data in items_data:
            item_id = data["branchMenuItemId"]
            qty = data["quantity"]
            
            branch_item = await transaction.branchmenuitem.find_unique(where={"id": item_id})
            if branch_item.availableQuantity is not None:
                # Use update_many for the atomic guard: where availableQuantity >= qty
                affected = await transaction.branchmenuitem.update_many(
                    where={
                        "id": item_id,
                        "availableQuantity": {"gte": qty}
                    },
                    data={
                        "availableQuantity": {"decrement": qty}
                    }
                )
                if affected == 0:
                    raise ValueError(f"Race condition: Insufficient stock for item ID {item_id}")
                
                # Fetch the updated item to calculate isInStock and log
                updated_item = await transaction.branchmenuitem.find_unique(where={"id": item_id})
                if updated_item.availableQuantity == 0:
                    await transaction.branchmenuitem.update(
                        where={"id": item_id},
                        data={"isInStock": False}
                    )
                
                # Insert StockHistoryLog for the decrement
                await transaction.stockhistorylog.create(
                    data={
                        "branchMenuItemId": item_id,
                        "changeType": "ORDER_DECREMENT",
                        "amountChanged": -qty,
                        "previousQuantity": branch_item.availableQuantity,
                        "newQuantity": updated_item.availableQuantity,
                        "reason": "Order Placed",
                        "note": f"Order #{order.id}",
                        "userId": user_id
                    }
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


async def update_order_status(order_id: int, new_status: str, user_id: Optional[int] = None):
    async with db.tx() as transaction:
        order = await transaction.order.update(
            where={"id": order_id},
            data={"status": new_status},
            include={"orderItems": True},
        )
        
        # If cancelled, restore stock
        if new_status == "CANCELLED":
            for item in order.orderItems:
                branch_item = await transaction.branchmenuitem.find_unique(where={"id": item.branchMenuItemId})
                if branch_item.availableQuantity is not None:
                    # Atomic increment
                    await transaction.branchmenuitem.update(
                        where={"id": item.branchMenuItemId},
                        data={
                            "availableQuantity": {"increment": item.quantity},
                            "isInStock": True # Auto-clear out of stock when restoring
                        }
                    )
                    updated_item = await transaction.branchmenuitem.find_unique(where={"id": item.branchMenuItemId})
                    
                    await transaction.stockhistorylog.create(
                        data={
                            "branchMenuItemId": item.branchMenuItemId,
                            "changeType": "ORDER_RESTORE",
                            "amountChanged": item.quantity,
                            "previousQuantity": branch_item.availableQuantity,
                            "newQuantity": updated_item.availableQuantity,
                            "reason": "Order Cancelled",
                            "note": f"Order #{order.id}",
                            "userId": user_id
                        }
                    )
                    
        return order


async def get_orders_by_cafe(cafe_id: int):
    """Fetch all orders across all branches of a café."""
    return await db.order.find_many(
        where={"branch": {"cafeId": cafe_id}},
        include={"branch": True},
        order={"createdAt": "desc"},
    )
