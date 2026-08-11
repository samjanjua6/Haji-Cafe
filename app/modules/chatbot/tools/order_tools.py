from app.database import db
from app.core.exceptions import UnauthorizedException

def build_order_tools(current_user, _check_branch_access):
    role = current_user.role.name
    tools = []

    async def get_recent_orders(branch_id: int, status: str = "") -> str:
        """
        [ALL ROLES] Get orders for a specific branch, optionally filtered by status.
        - branch_id: required integer. The branch to query.
        - status: optional filter. Pass one of: PENDING, IN_PREPARATION, COMPLETED, CANCELLED.
                  If omitted, returns the 50 most recent orders regardless of status.
        Use this for order history or status-based queries (e.g. show all cancelled orders).
        Use get_order_by_id instead when the user mentions a specific order number.
        """
        try:
            await _check_branch_access(branch_id)
        except UnauthorizedException as e:
            return str(e)

        where_clause: dict = {"branchId": branch_id}
        valid_statuses = {"PENDING", "IN_PREPARATION", "COMPLETED", "CANCELLED"}
        status_upper = status.strip().upper() if status else ""
        if status_upper in valid_statuses:
            where_clause["status"] = status_upper
        elif status_upper:
            return f"Invalid status filter '{status}'. Valid values: PENDING, IN_PREPARATION, COMPLETED, CANCELLED."

        orders = await db.order.find_many(
            where=where_clause,
            order={"createdAt": "desc"},
            take=50,
            include={"orderItems": {"include": {"branchMenuItem": {"include": {"masterItem": True}}}}}
        )

        if not orders:
            label = f"with status '{status_upper}'" if status_upper else ""
            return f"No orders found for branch {branch_id} {label}.".strip()

        label = f" (status: {status_upper})" if status_upper else ""
        order_ids = [str(o.id) for o in orders]
        res = f"Found {len(orders)} order(s) for Branch {branch_id}{label}. Order IDs: [{', '.join(order_ids)}]\n\n"
        for o in orders:
            items_str = ", ".join([f"{i.quantity}x {i.branchMenuItem.masterItem.name}" for i in o.orderItems])
            res += f"- Order #{o.id} (Status: {o.status}), Total Amount: ${o.totalAmount}, Created: {o.createdAt.strftime('%Y-%m-%d %H:%M')}, Items: [{items_str}]\n"
        return res

    async def get_order_by_id(order_id: int) -> str:
        """
        [ALL ROLES] Get full details of a specific order by its order ID.
        Use this whenever the user mentions a specific order number (e.g. 'order #5', 'order number 5',
        'details of order 5', 'is order 5 completed').
        NEVER answer questions about a specific order from memory — ALWAYS call this tool first.
        """
        order = await db.order.find_unique(
            where={"id": order_id},
            include={"orderItems": {"include": {"branchMenuItem": {"include": {"masterItem": True}}}}}
        )
        if not order:
            return f"Order #{order_id} not found."

        try:
            await _check_branch_access(order.branchId)
        except UnauthorizedException as e:
            return str(e)

        items_str = ", ".join([
            f"{i.quantity}x {i.branchMenuItem.masterItem.name} (${i.priceAtPurchase})"
            for i in order.orderItems
        ])
        return (
            f"Order #{order.id}\n"
            f"  Status:  {order.status}\n"
            f"  Total:   ${order.totalAmount}\n"
            f"  Branch:  {order.branchId}\n"
            f"  Created: {order.createdAt.strftime('%Y-%m-%d %H:%M')}\n"
            f"  Items:   {items_str}"
        )

    async def update_order_status(order_id: int, status: str) -> str:
        """
        [BRANCH_MANAGER, STAFF] Update the status of an order.
        Valid statuses: PENDING, IN_PREPARATION, COMPLETED, CANCELLED.
        IMPORTANT: This tool ONLY accepts 'order_id' (integer) and 'status' (string). Do NOT pass other parameters.
        """
        order = await db.order.find_unique(where={"id": order_id})
        if not order:
            return f"Order {order_id} not found."

        try:
            await _check_branch_access(order.branchId)
        except UnauthorizedException as e:
            return str(e)
            
        if status not in ["PENDING", "IN_PREPARATION", "COMPLETED", "CANCELLED"]:
            return f"Invalid status: {status}"
            
        await db.order.update(where={"id": order_id}, data={"status": status})
        return f"Order #{order_id} status updated to {status}."

    if role in ["SUPER_ADMIN", "CAFE_OWNER"]:
        tools.extend([get_recent_orders, get_order_by_id])
    elif role in ["BRANCH_MANAGER", "STAFF"]:
        tools.extend([get_recent_orders, get_order_by_id, update_order_status])

    return tools
