from typing import List, Optional
from pydantic import BaseModel, Field
import difflib
from app.database import db
from app.core.exceptions import UnauthorizedException, UnprocessableException

# Enums
from app.modules.orders.service import OrderStatusEnum

def build_tools(current_user, agent_type: str = "all"):
    """
    Returns a list of tool functions bound to the current_user's context.
    The LLM will only see the function signatures and docstrings.
    Security checks are enforced inside each function.
    """
    role = current_user.role.name
    user_id = current_user.id
    
    # Authorized scopes
    authorized_cafes = {scope.cafeId for scope in current_user.userScopes if scope.cafeId is not None}
    authorized_branches = {scope.branchId for scope in current_user.userScopes if scope.branchId is not None}

    def _check_cafe_access(cafe_id: int):
        if role == "SUPER_ADMIN": return
        if cafe_id not in authorized_cafes:
            raise UnauthorizedException(f"Access denied to cafe {cafe_id}.")

    def _check_branch_access(branch_id: int):
        if role == "SUPER_ADMIN": return
        if branch_id not in authorized_branches:
            raise UnauthorizedException(f"Access denied to branch {branch_id}.")

    async def get_my_cafes() -> str:
        """
        [SUPER_ADMIN, CAFE_OWNER] Get a summary of all cafes the user has access to.
        Returns cafe IDs and names.
        """
        if role not in ["SUPER_ADMIN", "CAFE_OWNER"]:
            return "Error: Your role does not allow viewing cafes."
            
        where_clause = {}
        if role != "SUPER_ADMIN":
            where_clause = {"id": {"in": list(authorized_cafes)}}
            
        cafes = await db.cafe.find_many(where=where_clause)
        if not cafes:
            return "You don't own any cafes."
            
        return "Cafes:\n" + "\n".join([f"- ID: {c.id}, Name: {c.name}" for c in cafes])

    async def get_branches_for_cafe(cafe_id: int) -> str:
        """
        [SUPER_ADMIN, CAFE_OWNER] Get all branches for a specific cafe_id.
        """
        try:
            _check_cafe_access(cafe_id)
        except UnauthorizedException as e:
            return str(e)
            
        branches = await db.branch.find_many(where={"cafeId": cafe_id})
        if not branches:
            return f"No branches found for cafe {cafe_id}."
            
        return f"Branches for Cafe {cafe_id}:\n" + "\n".join([f"- Branch ID: {b.id}, Name: {b.name}, Address: {b.address}" for b in branches])

    async def get_cafe(cafe_id: int) -> str:
        """
        [SUPER_ADMIN, CAFE_OWNER] Get details of a specific cafe.
        """
        try:
            _check_cafe_access(cafe_id)
        except UnauthorizedException as e:
            return str(e)
            
        cafe = await db.cafe.find_unique(where={"id": cafe_id}, include={"owner": True})
        if not cafe:
            return f"Cafe {cafe_id} not found."
            
        owner_email = cafe.owner.email if cafe.owner else "None"
        return f"Cafe ID: {cafe.id}\nName: {cafe.name}\nOwner: {owner_email}\nCreated: {cafe.createdAt}"

    async def search_cafes(query: str) -> str:
        """
        [SUPER_ADMIN, CAFE_OWNER] Search for a cafe by name. Use this if the user provides a cafe name with possible typos.
        """
        if role not in ["SUPER_ADMIN", "CAFE_OWNER"]:
            return "Error: Your role does not allow searching cafes."
            
        where_clause = {}
        if role != "SUPER_ADMIN":
            where_clause = {"id": {"in": list(authorized_cafes)}}
            
        cafes = await db.cafe.find_many(where=where_clause)
        if not cafes:
            return "You don't own any cafes to search."
            
        names = {c.name: c for c in cafes}
        # Fuzzy match
        matches = difflib.get_close_matches(query, names.keys(), n=3, cutoff=0.3)
        
        if not matches:
            return f"No cafes found matching '{query}'"
            
        matched_cafes = [names[m] for m in matches]
        return f"Search results for '{query}':\n" + "\n".join([f"- ID: {c.id}, Name: {c.name}" for c in matched_cafes])

    async def get_menu(cafe_id: int) -> str:
        """
        [SUPER_ADMIN, CAFE_OWNER] Get the master menu items for a specific cafe.
        """
        try:
            _check_cafe_access(cafe_id)
        except UnauthorizedException as e:
            return str(e)
            
        items = await db.mastermenuitem.find_many(
            where={"cafeId": cafe_id, "isDeleted": False},
            include={"category": True}
        )
        if not items:
            return f"No menu items found for cafe {cafe_id}."
            
        res = f"Menu for Cafe {cafe_id}:\n"
        for i in items:
            cat = i.category.name if i.category else "Uncategorized"
            res += f"- ID: {i.id} | Name: {i.name} | Category: {cat} | Base Price: ${i.basePrice}\n"
        return res

    async def search_menu(cafe_id: int, query: str) -> str:
        """
        [SUPER_ADMIN, CAFE_OWNER] Search for a menu item by name in a specific cafe. Handles typos.
        """
        try:
            _check_cafe_access(cafe_id)
        except UnauthorizedException as e:
            return str(e)
            
        items = await db.mastermenuitem.find_many(
            where={"cafeId": cafe_id, "isDeleted": False},
            include={"category": True}
        )
        if not items:
            return f"No menu items found for cafe {cafe_id}."
            
        names = {i.name: i for i in items}
        matches = difflib.get_close_matches(query, names.keys(), n=5, cutoff=0.3)
        
        if not matches:
            return f"No menu items found matching '{query}'"
            
        matched_items = [names[m] for m in matches]
        res = f"Menu search results for '{query}':\n"
        for i in matched_items:
            cat = i.category.name if i.category else "Uncategorized"
            res += f"- ID: {i.id} | Name: {i.name} | Category: {cat} | Base Price: ${i.basePrice}\n"
        return res


    async def get_branch_inventory(branch_id: int) -> str:
        """
        [ALL ROLES] Get the current inventory and menu items for a specific branch_id.
        """
        try:
            _check_branch_access(branch_id)
        except UnauthorizedException as e:
            return str(e)
            
        items = await db.branchmenuitem.find_many(
            where={"branchId": branch_id, "isActive": True},
            include={"masterItem": True}
        )
        if not items:
            return f"No inventory found for branch {branch_id}."
            
        lines = []
        for item in items:
            qty = "Infinite" if item.availableQuantity is None else str(item.availableQuantity)
            stock = "IN STOCK" if item.isInStock else "OUT OF STOCK"
            lines.append(f"- ID: {item.id}, Name: {item.masterItem.name}, Qty: {qty} ({stock})")
        return f"Inventory for Branch {branch_id}:\n" + "\n".join(lines)

    async def upsert_inventory_quantity(branch_id: int, item_id: int, quantity: int) -> str:
        """
        [BRANCH_MANAGER, STAFF] Update the available quantity of a specific menu item in a branch.
        Use this when asked to add or set stock.
        """
        try:
            _check_branch_access(branch_id)
        except UnauthorizedException as e:
            return str(e)
            
        item = await db.branchmenuitem.find_unique(where={"id": item_id})
        if not item or item.branchId != branch_id:
            return f"Menu item {item_id} not found in branch {branch_id}."
            
        await db.branchmenuitem.update(
            where={"id": item_id},
            data={"availableQuantity": quantity, "isInStock": quantity > 0}
        )
        return f"Successfully updated item {item_id} quantity to {quantity}."

    async def get_staff_list(cafe_id: int) -> str:
        """
        [SUPER_ADMIN, CAFE_OWNER] Get a list of all staff members for a specific cafe. 
        Returns their User IDs, Emails, and Roles.
        """
        try:
            _check_cafe_access(cafe_id)
        except UnauthorizedException as e:
            return str(e)
            
        from app.modules.cafes import service as cafe_service
        staff = await cafe_service.get_cafe_staff(cafe_id)
        if not staff:
            return f"No staff found for cafe {cafe_id}."
            
        res = f"Staff for Cafe {cafe_id}:\n"
        for s in staff:
            role_name = s.role.name if s.role else 'Unknown'
            res += f"- User ID: {s.id} | Email: {s.email} | Role: {role_name}\n"
        return res

    async def schedule_meeting(
        start_time_iso: str, 
        end_time_iso: str, 
        timezone: str,
        cafe_id: int = 0, 
        summary: str = "Staff Meeting", 
        description: str = "", 
        attendee_user_ids_comma_separated: str = ""
    ) -> str:
        """
        [SUPER_ADMIN, CAFE_OWNER] Schedule a Google Calendar meeting with staff.
        - start_time_iso & end_time_iso MUST be naive ISO 8601 strings (e.g. 2026-08-15T10:00:00) without 'Z'.
        - timezone MUST be the exact timezone string provided in your system prompt (e.g. 'Asia/Karachi').
        - attendee_user_ids_comma_separated MUST be a comma-separated list of User IDs (e.g. '2,4,5').
          Use get_staff_list first to find the correct User IDs.
        """
        if cafe_id == 0:
            return "ERROR: You must provide a valid cafe_id."
            
        if not attendee_user_ids_comma_separated:
            return "ERROR: You cannot schedule a meeting without attendees. You MUST ask the user which staff members they want to invite, and then use get_staff_list to find their IDs. Do NOT say the meeting was scheduled."
        try:
            _check_cafe_access(cafe_id)
        except UnauthorizedException as e:
            return str(e)
            
        try:
            from datetime import datetime
            start_time_iso = start_time_iso.replace('Z', '').split('+')[0].split('-0')[0]
            end_time_iso = end_time_iso.replace('Z', '').split('+')[0].split('-0')[0]
            start_dt = datetime.fromisoformat(start_time_iso)
            end_dt = datetime.fromisoformat(end_time_iso)
            user_ids = [int(x.strip()) for x in attendee_user_ids_comma_separated.split(",") if x.strip().isdigit()]
        except Exception as e:
            return f"Error parsing arguments: {e}. Please ensure ISO formats and valid integer IDs."
            
        try:
            from app.modules.cafes import service as cafe_service
            result = await cafe_service.schedule_staff_meeting(
                cafe_id=cafe_id,
                owner_user_id=user_id,
                summary=summary,
                description=description,
                start_time=start_dt,
                end_time=end_dt,
                attendee_user_ids=user_ids,
                timezone=timezone
            )
            return f"Meeting scheduled successfully! Link: {result.get('event_link')}"
        except Exception as e:
            return f"Failed to schedule meeting: {str(e)}"

    async def get_recent_orders(branch_id: int) -> str:
        """
        [ALL ROLES] Get the 10 most recent active orders for a specific branch_id.
        Useful for Kitchen Display or POS queries.
        """
        try:
            _check_branch_access(branch_id)
        except UnauthorizedException as e:
            return str(e)
            
        orders = await db.order.find_many(
            where={"branchId": branch_id},
            order={"createdAt": "desc"},
            take=10,
            include={"orderItems": {"include": {"branchMenuItem": {"include": {"masterItem": True}}}}}
        )
        
        if not orders:
            return f"No recent orders for branch {branch_id}."
            
        res = f"Recent Orders for Branch {branch_id}:\n"
        for o in orders:
            items_str = ", ".join([f"{i.quantity}x {i.branchMenuItem.masterItem.name}" for i in o.orderItems])
            res += f"- Order #{o.id} | Status: {o.status} | Total: ${o.totalAmount} | Items: {items_str}\n"
        return res

    async def update_order_status(order_id: int, status: str) -> str:
        """
        [BRANCH_MANAGER, STAFF] Update the status of an order. 
        Valid statuses: PENDING, IN_PREPARATION, COMPLETED, CANCELLED.
        """
        order = await db.order.find_unique(where={"id": order_id})
        if not order:
            return f"Order {order_id} not found."
            
        try:
            _check_branch_access(order.branchId)
        except UnauthorizedException as e:
            return str(e)
            
        # Optional: You could reuse the service.transition_status logic here, but direct update is fine for the chatbot for now, 
        # or we can import the service method. Let's do direct update for simplicity, assuming LLM provides correct status.
        if status not in ["PENDING", "IN_PREPARATION", "COMPLETED", "CANCELLED"]:
            return f"Invalid status: {status}"
            
        await db.order.update(where={"id": order_id}, data={"status": status})
        return f"Order #{order_id} status updated to {status}."

    # Return the tools that this user's role is allowed to see
    tools = []
    
    if role in ["SUPER_ADMIN", "CAFE_OWNER"]:
        tools.extend([get_my_cafes, get_cafe, get_menu, get_branches_for_cafe, get_branch_inventory, get_recent_orders])
        
    if role in ["BRANCH_MANAGER", "STAFF"]:
        tools.extend([get_branch_inventory, get_recent_orders, upsert_inventory_quantity, update_order_status])
        
    # Super Admin gets all tools
    if role == "SUPER_ADMIN":
        tools = [get_my_cafes, search_cafes, get_cafe, get_menu, search_menu, get_branches_for_cafe, get_branch_inventory, upsert_inventory_quantity, get_recent_orders, update_order_status, get_staff_list, schedule_meeting]
    else:
        # Re-build for specific roles to include new tools
        if role == "CAFE_OWNER":
            tools.extend([search_cafes, search_menu, get_staff_list, schedule_meeting])
        
    # Deduplicate in case of overlaps
    unique_tools = list({f.__name__: f for f in tools}.values())
    
    if agent_type == "cafe":
        allowed = {"get_my_cafes", "search_cafes", "get_cafe", "get_branches_for_cafe", "get_staff_list", "schedule_meeting"}
        unique_tools = [t for t in unique_tools if t.__name__ in allowed]
    elif agent_type == "inventory":
        allowed = {"get_menu", "search_menu", "get_branch_inventory", "upsert_inventory_quantity"}
        unique_tools = [t for t in unique_tools if t.__name__ in allowed]
    elif agent_type == "order":
        allowed = {"get_recent_orders", "update_order_status"}
        unique_tools = [t for t in unique_tools if t.__name__ in allowed]
    elif agent_type == "supervisor":
        unique_tools = []
        
    return unique_tools
