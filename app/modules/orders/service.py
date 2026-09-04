from decimal import Decimal
import datetime
from typing import List, Optional

from app.core.exceptions import BadRequestException, NotFoundException, UnprocessableException
from app.modules.orders import repository
from app.modules.orders.schemas import OrderItemCreate, OrderStatusEnum, VALID_TRANSITIONS


async def place_order(
    branch_id: int,
    user_id: Optional[int],
    items: List[OrderItemCreate],
    customer_phone: Optional[str] = None,
    customer_name: Optional[str] = None,
    order_type: Optional[str] = "DINE_IN",
    table_number: Optional[str] = None,
    delivery_address: Optional[str] = None,
):
    """
    Place a new order. Business rules enforced:
    1. All items must belong to this branch
    2. All items must be in stock and active
    3. price_at_purchase is snapshotted from effective price at time of order
    4. total_amount is computed server-side (never trusted from client)
    """
    item_ids = [item.branch_menu_item_id for item in items]
    branch_items = await repository.get_branch_menu_items_by_ids(branch_id, item_ids)

    # Build a lookup map for fast access
    item_map = {bi.id: bi for bi in branch_items}

    # Validate all requested items exist in this branch
    for item in items:
        if item.branch_menu_item_id not in item_map:
            raise BadRequestException(
                f"Item ID {item.branch_menu_item_id} not found in this branch."
            )
        branch_item = item_map[item.branch_menu_item_id]
        if not branch_item.isInStock or not branch_item.isActive:
            raise BadRequestException(
                f"Item '{branch_item.masterItem.name}' is currently unavailable."
            )
        if item.quantity <= 0:
            raise BadRequestException("Quantity must be at least 1.")
            
        if branch_item.availableQuantity is not None and branch_item.availableQuantity < item.quantity:
            raise BadRequestException(
                f"Item '{branch_item.masterItem.name}' has insufficient stock (Only {branch_item.availableQuantity} left)."
            )

    # Build line item data with price snapshot
    items_data = []
    total = Decimal("0.00")
    for item in items:
        branch_item = item_map[item.branch_menu_item_id]
        # Effective price: override if set, otherwise fall back to master base price
        effective_price = branch_item.priceOverride if branch_item.priceOverride is not None else branch_item.masterItem.basePrice
        line_total = effective_price * item.quantity
        total += line_total
        items_data.append({
            "branchMenuItemId": item.branch_menu_item_id,
            "quantity": item.quantity,
            "priceAtPurchase": effective_price,
            "notes": item.notes,
        })

    order = await repository.create_order(
        branch_id=branch_id,
        user_id=user_id,
        total_amount=total,
        items_data=items_data,
        customer_phone=customer_phone,
        customer_name=customer_name,
        order_type=order_type or "DINE_IN",
        table_number=table_number,
        delivery_address=delivery_address,
    )

    # Real-time WebSocket broadcast (non-blocking)
    try:
        from app.modules.realtime.manager import order_ws_manager
        from app.utils.serializer import prisma_to_dict
        await order_ws_manager.broadcast_to_branch(
            branch_id=branch_id,
            event="ORDER_CREATED",
            payload=prisma_to_dict(order),
        )
    except Exception:
        pass

    return order


def _build_orders_query(search: str = None, statuses: str = None, date_from: str = None, date_to: str = None, sort_by: str = "createdAt", sort_dir: str = "desc"):
    where = {}
    if search:
        if search.isdigit():
            where["id"] = int(search)
        else:
            where["id"] = -1
            
    if statuses:
        status_list = [s.strip() for s in statuses.split(",")]
        where["status"] = {"in": status_list}
        
    if date_from or date_to:
        created_at_filter = {}
        if date_from:
            try:
                # Handle YYYY-MM-DD format from <input type="date">
                date_from_dt = datetime.datetime.strptime(date_from, "%Y-%m-%d").replace(tzinfo=datetime.timezone.utc)
                created_at_filter["gte"] = date_from_dt
            except ValueError:
                pass
        if date_to:
            try:
                date_to_dt = datetime.datetime.strptime(date_to, "%Y-%m-%d").replace(tzinfo=datetime.timezone.utc)
                created_at_filter["lt"] = date_to_dt + datetime.timedelta(days=1)
            except ValueError:
                pass
        if created_at_filter:
            where["createdAt"] = created_at_filter
            
    order_by = {sort_by: sort_dir}
    return where, order_by


async def get_branch_orders(branch_id: int, page: int = 1, limit: int = 25, search: str = None, statuses: str = None, date_from: str = None, date_to: str = None, sort_by: str = "createdAt", sort_dir: str = "desc"):
    where, order_by = _build_orders_query(search, statuses, date_from, date_to, sort_by, sort_dir)
    skip = (page - 1) * limit
    return await repository.get_orders_by_branch(branch_id, skip, limit, where, order_by)


async def get_order_detail(branch_id: int, order_id: int):
    order = await repository.get_order_by_id(order_id)
    if not order or order.branchId != branch_id:
        raise NotFoundException("Order not found.")
    return order


async def transition_status(branch_id: int, order_id: int, new_status: OrderStatusEnum, user_id: Optional[int] = None):
    """
    Enforce the strict state machine:
      PENDING → IN_PREPARATION
      IN_PREPARATION → COMPLETED | CANCELLED
      COMPLETED and CANCELLED are terminal states.
    """
    order = await get_order_detail(branch_id, order_id)
    current_status = OrderStatusEnum(getattr(order.status, "value", order.status))
    allowed_transitions = VALID_TRANSITIONS.get(current_status, [])

    if new_status not in allowed_transitions:
        raise UnprocessableException(
            f"Cannot transition from '{current_status}' to '{new_status}'. "
            f"Allowed: {[s.value for s in allowed_transitions] or 'none (terminal state)'}"
        )

    updated_order = await repository.update_order_status(order_id, new_status.value, user_id)

    # Real-time WebSocket broadcast (non-blocking)
    try:
        from app.modules.realtime.manager import order_ws_manager
        from app.utils.serializer import prisma_to_dict
        await order_ws_manager.broadcast_to_branch(
            branch_id=branch_id,
            event="ORDER_STATUS_UPDATED",
            payload=prisma_to_dict(updated_order),
        )
    except Exception:
        pass

    return updated_order


async def get_cafe_orders(cafe_id: int, branch_id: int = None, page: int = 1, limit: int = 25, search: str = None, statuses: str = None, date_from: str = None, date_to: str = None, sort_by: str = "createdAt", sort_dir: str = "desc"):
    where, order_by = _build_orders_query(search, statuses, date_from, date_to, sort_by, sort_dir)
    if branch_id:
        where["branchId"] = branch_id
    skip = (page - 1) * limit
    return await repository.get_orders_by_cafe(cafe_id, skip, limit, where, order_by)
