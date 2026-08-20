from app.database import db
from app.core.exceptions import UnauthorizedException

def build_order_tools(current_user, _check_branch_access):
    role = current_user.role.name
    tools = []

    user_branch_ids = {scope.branchId for scope in (current_user.userScopes or []) if scope.branchId is not None}

    def _resolve_branch_id(branch_id: int) -> int:
        if (branch_id is None or branch_id == 0) and len(user_branch_ids) == 1:
            return list(user_branch_ids)[0]
        return branch_id or 0

    async def get_recent_orders(branch_id: int = 0, status: str = "") -> str:
        """
        [ALL ROLES] Get orders for a specific branch, optionally filtered by status.
        - branch_id: the branch to query (auto-selected if you manage 1 branch).
        - status: optional filter (PENDING, IN_PREPARATION, COMPLETED, CANCELLED).
        """
        branch_id = _resolve_branch_id(branch_id)
        if branch_id == 0:
            return "ERROR: A valid branch_id is required."

        try:
            await _check_branch_access(branch_id)
        except UnauthorizedException as e:
            return str(e)

        try:
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
        except Exception as e:
            return f"Error retrieving orders: {str(e)}"

    async def get_order_by_id(order_id: int) -> str:
        """
        [ALL ROLES] Get full details of a specific order by its order ID.
        """
        if not order_id:
            return "ERROR: An order_id is required."

        try:
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
        except Exception as e:
            return f"Error retrieving order #{order_id}: {str(e)}"

    async def update_order_status(order_id: int, status: str) -> str:
        """
        [BRANCH_MANAGER, STAFF] Update the status of an order.
        Valid statuses: PENDING, IN_PREPARATION, COMPLETED, CANCELLED.
        """
        if not order_id:
            return "ERROR: An order_id is required."

        try:
            order = await db.order.find_unique(where={"id": order_id})
            if not order:
                return f"Order {order_id} not found."

            try:
                await _check_branch_access(order.branchId)
            except UnauthorizedException as e:
                return str(e)
                
            status_upper = status.strip().upper()
            if status_upper not in ["PENDING", "IN_PREPARATION", "COMPLETED", "CANCELLED"]:
                return f"Invalid status: {status}. Must be one of: PENDING, IN_PREPARATION, COMPLETED, CANCELLED."
                
            await db.order.update(where={"id": order_id}, data={"status": status_upper})
            return f"Order #{order_id} status updated to {status_upper}."
        except Exception as e:
            return f"Error updating order status: {str(e)}"

    if role in ["SUPER_ADMIN", "CAFE_OWNER"]:
        tools.extend([get_recent_orders, get_order_by_id])
    elif role in ["BRANCH_MANAGER", "STAFF"]:
        tools.extend([get_recent_orders, get_order_by_id, update_order_status])

    return tools
