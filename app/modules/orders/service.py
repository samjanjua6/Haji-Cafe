from decimal import Decimal
from typing import List, Optional

from app.core.exceptions import BadRequestException, NotFoundException, UnprocessableException
from app.modules.orders import repository
from app.modules.orders.schemas import OrderItemCreate, OrderStatusEnum, VALID_TRANSITIONS


async def place_order(branch_id: int, user_id: Optional[int], items: List[OrderItemCreate]):
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

    return await repository.create_order(branch_id, user_id, total, items_data)


async def get_branch_orders(branch_id: int):
    return await repository.get_orders_by_branch(branch_id)


async def get_order_detail(branch_id: int, order_id: int):
    order = await repository.get_order_by_id(order_id)
    if not order or order.branchId != branch_id:
        raise NotFoundException("Order not found.")
    return order


async def transition_status(branch_id: int, order_id: int, new_status: OrderStatusEnum):
    """
    Enforce the strict state machine:
      PENDING → IN_PREPARATION
      IN_PREPARATION → COMPLETED | CANCELLED
      COMPLETED and CANCELLED are terminal states.
    """
    order = await get_order_detail(branch_id, order_id)
    current_status = OrderStatusEnum(order.status.value)
    allowed_transitions = VALID_TRANSITIONS.get(current_status, [])

    if new_status not in allowed_transitions:
        raise UnprocessableException(
            f"Cannot transition from '{current_status}' to '{new_status}'. "
            f"Allowed: {[s.value for s in allowed_transitions] or 'none (terminal state)'}"
        )

    return await repository.update_order_status(order_id, new_status.value)


async def get_cafe_orders(cafe_id: int):
    return await repository.get_orders_by_cafe(cafe_id)
