from typing import List

from fastapi import APIRouter, Depends, status

from app.middleware.rbac import require_branch_access, require_cafe_access
from app.modules.menu import service
from app.modules.menu.schemas import (
    BranchMenuItemCreate,
    BranchMenuItemPatch,
    MasterMenuItemCreate,
    MasterMenuItemUpdate,
)
from app.utils.serializer import prisma_to_dict

router = APIRouter()


# ── Master Menu Endpoints ────────────────────────────────────────────

@router.post("/cafes/{cafe_id}/menu", status_code=status.HTTP_201_CREATED)
async def create_master_item(
    cafe_id: int,
    body: MasterMenuItemCreate,
    current_user=Depends(require_cafe_access()),
):
    """[CAFE_OWNER, SUPER_ADMIN] Create a master menu item for a café."""
    result = await service.create_master_item(cafe_id, body.name, body.description, body.base_price, body.category_id, current_user.id)
    return prisma_to_dict(result)


@router.get("/cafes/{cafe_id}/menu")
async def list_master_items(
    cafe_id: int,
    _=Depends(require_cafe_access()),
):
    """[CAFE_OWNER, SUPER_ADMIN] List all active master menu items."""
    items = await service.get_master_items(cafe_id)
    return prisma_to_dict(items)


@router.put("/cafes/{cafe_id}/menu/{item_id}")
async def update_master_item(
    cafe_id: int,
    item_id: int,
    body: MasterMenuItemUpdate,
    current_user=Depends(require_cafe_access()),
):
    """[CAFE_OWNER, SUPER_ADMIN] Update a master menu item."""
    result = await service.update_master_item(cafe_id, item_id, body.model_dump(), current_user.id)
    return prisma_to_dict(result)


@router.delete("/cafes/{cafe_id}/menu/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_master_item(
    cafe_id: int,
    item_id: int,
    current_user=Depends(require_cafe_access()),
):
    """[CAFE_OWNER, SUPER_ADMIN] Soft-delete a master menu item."""
    await service.soft_delete_master_item(cafe_id, item_id, current_user.id)


# ── Branch Menu Endpoints ────────────────────────────────────────────

@router.post("/branches/{branch_id}/menu", status_code=status.HTTP_201_CREATED)
async def set_branch_menu_item(
    branch_id: int,
    body: BranchMenuItemCreate,
    current_user=Depends(require_branch_access()),
):
    """[BRANCH_MANAGER, SUPER_ADMIN] Set price override and stock status for a branch menu item."""
    result = await service.set_branch_menu_item(branch_id, body.master_item_id, body.price_override, body.is_in_stock, body.available_quantity, current_user.id)
    return prisma_to_dict(result)


@router.get("/branches/{branch_id}/menu")
async def get_branch_menu(
    branch_id: int,
    _=Depends(require_branch_access()),
):
    """[BRANCH_MANAGER, STAFF, SUPER_ADMIN] Get the active branch menu with effective prices."""
    return await service.get_branch_menu(branch_id)


@router.get("/branches/{branch_id}/master-menu")
async def get_branch_master_menu(
    branch_id: int,
    _=Depends(require_branch_access()),
):
    """[BRANCH_MANAGER, STAFF, SUPER_ADMIN] Get the master menu items for the café that owns this branch."""
    from app.modules.cafes.repository import get_branch_by_id
    from app.core.exceptions import NotFoundException
    branch = await get_branch_by_id(branch_id)
    if not branch:
        raise NotFoundException("Branch not found.")
    items = await service.get_master_items(branch.cafeId)
    return prisma_to_dict(items)


@router.patch("/branches/{branch_id}/menu/{item_id}")
async def patch_branch_menu_item(
    branch_id: int,
    item_id: int,
    body: BranchMenuItemPatch,
    current_user=Depends(require_branch_access()),
):
    """[BRANCH_MANAGER, SUPER_ADMIN] Toggle in-stock status or update price override."""
    result = await service.patch_branch_menu_item(branch_id, item_id, body.model_dump(exclude_unset=True), current_user.id)
    return prisma_to_dict(result)

# ── Stock Management Endpoints ────────────────────────────────────────────

@router.get("/cafes/{cafe_id}/stock-rollup")
async def get_cafe_stock_rollup(
    cafe_id: int,
    _=Depends(require_cafe_access()),
):
    """[CAFE_OWNER, SUPER_ADMIN] Get a rollup of stock for all branches."""
    return await service.get_cafe_stock_rollup(cafe_id)

from app.modules.menu.schemas import StockUpdateRequest, ThresholdUpdateRequest

@router.put("/branches/{branch_id}/menu/{item_id}/stock")
async def update_item_stock(
    branch_id: int,
    item_id: int,
    body: StockUpdateRequest,
    current_user=Depends(require_branch_access()),
):
    """[BRANCH_MANAGER, SUPER_ADMIN] Adjust stock quantity or manual override toggle."""
    result = await service.update_item_stock(
        branch_id, item_id, body.available_quantity, body.is_in_stock, body.reason, body.note, current_user.id
    )
    return prisma_to_dict(result)

@router.put("/branches/{branch_id}/menu/{item_id}/threshold")
async def update_item_threshold(
    branch_id: int,
    item_id: int,
    body: ThresholdUpdateRequest,
    current_user=Depends(require_branch_access()),
):
    """[CAFE_OWNER, SUPER_ADMIN] Update low stock threshold for a branch item."""
    if current_user.role.name not in ["CAFE_OWNER", "SUPER_ADMIN"]:
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException("Only Cafe Owners can update stock thresholds.")
        
    result = await service.update_item_threshold(branch_id, item_id, body.low_stock_threshold)
    return prisma_to_dict(result)

@router.get("/branches/{branch_id}/menu/{item_id}/stock-history")
async def get_item_stock_history(
    branch_id: int,
    item_id: int,
    _=Depends(require_branch_access()),
):
    """[BRANCH_MANAGER, STAFF, CAFE_OWNER, SUPER_ADMIN] Get history logs for an item."""
    result = await service.get_item_stock_history(branch_id, item_id)
    return prisma_to_dict(result)
