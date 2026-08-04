from typing import List

from fastapi import APIRouter, Depends, status

from app.middleware.auth_middleware import get_current_user
from app.middleware.rbac import require_branch_access, require_cafe_access, require_role
from app.modules.orders import service
from app.modules.orders.schemas import OrderCreate, OrderResponse, OrderStatusUpdate

router = APIRouter()


# ── Branch Order Endpoints ───────────────────────────────────────────

@router.post("/branches/{branch_id}/orders", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def place_order(
    branch_id: int,
    body: OrderCreate,
    current_user=Depends(require_branch_access()),
):
    """[STAFF, BRANCH_MANAGER, SUPER_ADMIN] Place a new order at a branch."""
    return await service.place_order(branch_id, current_user.id, body.items)


@router.get("/branches/{branch_id}/orders", response_model=List[OrderResponse])
async def list_branch_orders(
    branch_id: int,
    _=Depends(require_branch_access()),
):
    """[BRANCH_MANAGER, SUPER_ADMIN] List all orders for a branch."""
    return await service.get_branch_orders(branch_id)


@router.get("/branches/{branch_id}/orders/{order_id}", response_model=OrderResponse)
async def get_order(
    branch_id: int,
    order_id: int,
    _=Depends(require_branch_access()),
):
    """[BRANCH_MANAGER, STAFF, SUPER_ADMIN] Get a single order with its line items."""
    return await service.get_order_detail(branch_id, order_id)


@router.patch("/branches/{branch_id}/orders/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    branch_id: int,
    order_id: int,
    body: OrderStatusUpdate,
    _=Depends(require_branch_access()),
):
    """[STAFF, BRANCH_MANAGER, SUPER_ADMIN] Transition an order's status (enforces state machine)."""
    return await service.transition_status(branch_id, order_id, body.status)


# ── Cafe-level Aggregate Order Endpoint ─────────────────────────────

@router.get("/cafes/{cafe_id}/orders", response_model=List[OrderResponse])
async def list_cafe_orders(
    cafe_id: int,
    _=Depends(require_cafe_access()),
):
    """[CAFE_OWNER, SUPER_ADMIN] Aggregate order history across all branches of a café."""
    return await service.get_cafe_orders(cafe_id)
