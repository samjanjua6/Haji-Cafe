from typing import Optional
from fastapi import APIRouter, Depends, Query, status

from app.middleware.rbac import require_branch_access, require_cafe_access
from app.modules.orders import service
from app.modules.orders.schemas import OrderCreate, OrderStatusUpdate
from app.utils.serializer import prisma_to_dict

router = APIRouter()


# ── Branch Order Endpoints ───────────────────────────────────────────

@router.post("/branches/{branch_id}/orders", status_code=status.HTTP_201_CREATED)
async def place_order(
    branch_id: int,
    body: OrderCreate,
    current_user=Depends(require_branch_access()),
):
    return prisma_to_dict(
        await service.place_order(
            branch_id,
            current_user.id,
            body.items,
            customer_phone=body.customer_phone,
            customer_name=body.customer_name,
            order_type=body.order_type,
            table_number=body.table_number,
            delivery_address=body.delivery_address,
        )
    )


@router.get("/branches/{branch_id}/orders")
async def list_branch_orders(
    branch_id: int,
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[str] = None,
    dateFrom: Optional[str] = None,
    dateTo: Optional[str] = None,
    sortBy: str = Query("createdAt"),
    sortDir: str = Query("desc"),
    _=Depends(require_branch_access()),
):
    """[BRANCH_MANAGER, SUPER_ADMIN] List all orders for a branch."""
    return prisma_to_dict(await service.get_branch_orders(
        branch_id, page, limit, search, status, dateFrom, dateTo, sortBy, sortDir
    ))


@router.get("/branches/{branch_id}/orders/{order_id}")
async def get_order(
    branch_id: int,
    order_id: int,
    _=Depends(require_branch_access()),
):
    """[BRANCH_MANAGER, STAFF, SUPER_ADMIN] Get a single order with its line items."""
    return prisma_to_dict(await service.get_order_detail(branch_id, order_id))


@router.patch("/branches/{branch_id}/orders/{order_id}/status")
async def update_order_status(
    branch_id: int,
    order_id: int,
    body: OrderStatusUpdate,
    current_user=Depends(require_branch_access()),
):
    """[STAFF, BRANCH_MANAGER, SUPER_ADMIN] Transition an order's status (enforces state machine)."""
    return prisma_to_dict(await service.transition_status(branch_id, order_id, body.status, current_user.id))


# ── Cafe-level Aggregate Order Endpoint ─────────────────────────────

@router.get("/cafes/{cafe_id}/orders")
async def list_cafe_orders(
    cafe_id: int,
    branchId: Optional[int] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[str] = None,
    dateFrom: Optional[str] = None,
    dateTo: Optional[str] = None,
    sortBy: str = Query("createdAt"),
    sortDir: str = Query("desc"),
    _=Depends(require_cafe_access()),
):
    """[CAFE_OWNER, SUPER_ADMIN] Aggregate order history across all branches of a café."""
    return prisma_to_dict(await service.get_cafe_orders(
        cafe_id, branchId, page, limit, search, status, dateFrom, dateTo, sortBy, sortDir
    ))
