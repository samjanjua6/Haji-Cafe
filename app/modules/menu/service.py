from decimal import Decimal
from typing import Optional

from app.core.exceptions import NotFoundException
from app.modules.menu import repository


# --- Master Menu Service ---

async def create_master_item(cafe_id: int, name: str, description: Optional[str], base_price: Decimal, category_id: Optional[int]):
    return await repository.create_master_item(cafe_id, name, description, base_price, category_id)


async def get_master_items(cafe_id: int):
    return await repository.get_master_items_by_cafe(cafe_id)


async def update_master_item(cafe_id: int, item_id: int, data: dict):
    item = await repository.get_master_item_by_id(item_id)
    if not item or item.cafeId != cafe_id or item.isDeleted:
        raise NotFoundException("Menu item not found.")
    clean = {k: v for k, v in data.items() if v is not None}
    return await repository.update_master_item(item_id, clean)


async def soft_delete_master_item(cafe_id: int, item_id: int):
    item = await repository.get_master_item_by_id(item_id)
    if not item or item.cafeId != cafe_id:
        raise NotFoundException("Menu item not found.")
    return await repository.soft_delete_master_item(item_id)


# --- Branch Menu Service ---

async def set_branch_menu_item(branch_id: int, master_item_id: int, price_override: Optional[Decimal], is_in_stock: bool):
    return await repository.upsert_branch_menu_item(branch_id, master_item_id, price_override, is_in_stock)


async def get_branch_menu(branch_id: int):
    """
    Returns the branch menu with effectivePrice resolved.
    Effective price = priceOverride if set, else master item's basePrice.
    Returns camelCase dicts matching Prisma attribute names.
    """
    items = await repository.get_branch_menu(branch_id)
    result = []
    for item in items:
        master = item.masterItem
        effective = item.priceOverride if item.priceOverride is not None else master.basePrice
        result.append({
            "id": item.id,
            "branchId": item.branchId,
            "masterItemId": item.masterItemId,
            "priceOverride": float(item.priceOverride) if item.priceOverride is not None else None,
            "isInStock": item.isInStock,
            "isActive": item.isActive,
            "effectivePrice": float(effective),
            "masterItem": {
                "id": master.id,
                "name": master.name,
                "basePrice": float(master.basePrice),
                "description": master.description,
            },
        })
    return result


async def patch_branch_menu_item(branch_id: int, item_id: int, data: dict):
    item = await repository.get_branch_menu_item_by_id(item_id)
    if not item or item.branchId != branch_id:
        raise NotFoundException("Branch menu item not found.")
    clean = {k: v for k, v in data.items() if v is not None}
    return await repository.patch_branch_menu_item(item_id, clean)
