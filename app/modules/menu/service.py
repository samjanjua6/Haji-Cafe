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
    Returns the branch menu with effective_price resolved.
    Effective price = price_override if set, else master item's base_price.
    """
    items = await repository.get_branch_menu(branch_id)
    result = []
    for item in items:
        item_dict = {
            "id": item.id,
            "branch_id": item.branchId,
            "master_item_id": item.masterItemId,
            "price_override": item.priceOverride,
            "is_in_stock": item.isInStock,
            "is_active": item.isActive,
            "effective_price": item.priceOverride if item.priceOverride is not None else item.masterItem.basePrice,
        }
        result.append(item_dict)
    return result


async def patch_branch_menu_item(branch_id: int, item_id: int, data: dict):
    item = await repository.get_branch_menu_item_by_id(item_id)
    if not item or item.branchId != branch_id:
        raise NotFoundException("Branch menu item not found.")
    clean = {k: v for k, v in data.items() if v is not None}
    return await repository.patch_branch_menu_item(item_id, clean)
