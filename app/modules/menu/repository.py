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
