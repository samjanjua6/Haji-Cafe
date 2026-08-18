from decimal import Decimal
from typing import Optional

from app.database import db


# --- Master Menu Repository ---

async def create_master_item(cafe_id: int, name: str, description: Optional[str], base_price: Decimal, category_id: Optional[int]):
    return await db.mastermenuitem.create(data={
        "cafeId": cafe_id,
        "name": name,
        "description": description,
        "basePrice": base_price,
        "categoryId": category_id,
    })


async def get_master_items_by_cafe(cafe_id: int):
    return await db.mastermenuitem.find_many(
        where={"cafeId": cafe_id, "isDeleted": False},
        include={"category": True},
    )


async def get_master_item_by_id(item_id: int):
    return await db.mastermenuitem.find_unique(where={"id": item_id})


async def update_master_item(item_id: int, data: dict):
    return await db.mastermenuitem.update(where={"id": item_id}, data=data)


async def soft_delete_master_item(item_id: int):
    return await db.mastermenuitem.update(where={"id": item_id}, data={"isDeleted": True})


# --- Branch Menu Repository ---

async def upsert_branch_menu_item(branch_id: int, master_item_id: int, price_override: Optional[Decimal], is_in_stock: bool, available_quantity: Optional[int]):
    return await db.branchmenuitem.upsert(
        where={"branchId_masterItemId": {"branchId": branch_id, "masterItemId": master_item_id}},
        data={
            "create": {
                "branchId": branch_id,
                "masterItemId": master_item_id,
                "priceOverride": price_override,
                "availableQuantity": available_quantity,
                "isInStock": is_in_stock,
            },
            "update": {
                "priceOverride": price_override,
                "availableQuantity": available_quantity,
                "isInStock": is_in_stock,
            },
        },
        include={"masterItem": True},
    )


async def get_branch_menu(branch_id: int):
    return await db.branchmenuitem.find_many(
        where={"branchId": branch_id, "isActive": True, "masterItem": {"isDeleted": False}},
        include={"masterItem": True},
    )


async def get_branch_menu_item_by_id(item_id: int):
    return await db.branchmenuitem.find_unique(
        where={"id": item_id},
        include={"masterItem": True},
    )


async def patch_branch_menu_item(item_id: int, data: dict):
    return await db.branchmenuitem.update(where={"id": item_id}, data=data)

# --- Stock Management Repository ---

async def get_all_branch_items_by_cafe(cafe_id: int):
    return await db.branchmenuitem.find_many(
        where={"branch": {"cafeId": cafe_id}, "isActive": True, "masterItem": {"isDeleted": False}},
        include={"masterItem": True, "branch": True},
    )

async def update_stock_and_log(item_id: int, old_item, new_qty: Optional[int], new_in_stock: Optional[bool], reason: str, note: Optional[str], user_id: int):
    """Update stock quantity/override and create a history log in a single transaction."""
    async with db.tx() as transaction:
        data = {}
        if new_qty is not None:
            data["availableQuantity"] = new_qty
            # Auto-clear override if setting positive quantity
            if new_qty > 0 and old_item.isInStock is False:
                data["isInStock"] = True
                new_in_stock = True # ensure log captures this
        if new_in_stock is not None:
            data["isInStock"] = new_in_stock
            
        updated = await transaction.branchmenuitem.update(
            where={"id": item_id},
            data=data,
            include={"masterItem": True}
        )

        # Log quantity adjustment
        if new_qty is not None and old_item.availableQuantity != new_qty:
            diff = new_qty - (old_item.availableQuantity or 0)
            await transaction.stockhistorylog.create(data={
                "branchMenuItemId": item_id,
                "changeType": "MANUAL_ADJUSTMENT",
                "amountChanged": diff,
                "previousQuantity": old_item.availableQuantity,
                "newQuantity": new_qty,
                "reason": reason,
                "note": note,
                "userId": user_id
            })
            
        # Log manual override toggle
        if new_in_stock is not None and old_item.isInStock != new_in_stock:
            await transaction.stockhistorylog.create(data={
                "branchMenuItemId": item_id,
                "changeType": "MANUAL_OVERRIDE_ON" if not new_in_stock else "MANUAL_OVERRIDE_OFF",
                "amountChanged": 0,
                "previousQuantity": new_qty if new_qty is not None else old_item.availableQuantity,
                "newQuantity": new_qty if new_qty is not None else old_item.availableQuantity,
                "reason": reason,
                "note": note,
                "userId": user_id
            })
            
        return updated

async def get_stock_history_logs(item_id: int):
    return await db.stockhistorylog.find_many(
        where={"branchMenuItemId": item_id},
        include={"user": True},
        order={"createdAt": "desc"}
    )
