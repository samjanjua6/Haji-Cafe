from app.database import db
from app.core.exceptions import UnauthorizedException
import difflib

def build_inventory_tools(current_user, _check_cafe_access, _check_branch_access):
    role = current_user.role.name
    tools = []

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
        [ALL ROLES] Get the current inventory and menu items for a specific branch.
        IMPORTANT: This tool ONLY accepts 'branch_id' (integer). Do NOT pass any other
        parameters such as item_name, query, or filter. To search for a specific item,
        call this tool first and then filter the returned list yourself.
        """
        try:
            await _check_branch_access(branch_id)
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
        [BRANCH_MANAGER] Update the available quantity of a specific menu item in a branch.
        Use this when asked to add or set stock.
        """
        try:
            await _check_branch_access(branch_id)
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

    if role in ["SUPER_ADMIN", "CAFE_OWNER"]:
        tools.extend([get_menu, search_menu, get_branch_inventory, upsert_inventory_quantity])
    elif role in ["BRANCH_MANAGER", "STAFF"]:
        tools.extend([get_branch_inventory, upsert_inventory_quantity])
        
    return tools
