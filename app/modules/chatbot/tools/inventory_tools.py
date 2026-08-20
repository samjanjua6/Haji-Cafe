from app.database import db
from app.core.exceptions import UnauthorizedException
import difflib

def build_inventory_tools(current_user, _check_cafe_access, _check_branch_access):
    role = current_user.role.name
    user_id = current_user.id
    tools = []

    # Get single cafe / branch defaults if available
    user_cafe_ids = {scope.cafeId for scope in (current_user.userScopes or []) if scope.cafeId is not None}
    if hasattr(current_user, "ownedCafes") and current_user.ownedCafes:
        for c in current_user.ownedCafes:
            if not getattr(c, "isArchived", False):
                user_cafe_ids.add(c.id)
    user_branch_ids = {scope.branchId for scope in (current_user.userScopes or []) if scope.branchId is not None}

    def _resolve_cafe_id(cafe_id: int) -> int:
        if (cafe_id is None or cafe_id == 0) and len(user_cafe_ids) == 1:
            return list(user_cafe_ids)[0]
        return cafe_id or 0

    def _resolve_branch_id(branch_id: int) -> int:
        if (branch_id is None or branch_id == 0) and len(user_branch_ids) == 1:
            return list(user_branch_ids)[0]
        return branch_id or 0

    # ── MASTER MENU TOOLS (CAFE_OWNER / SUPER_ADMIN) ─────────────────────────

    async def get_menu(cafe_id: int = 0) -> str:
        """
        [SUPER_ADMIN, CAFE_OWNER] Get the master menu items for a specific cafe.
        Returns item IDs, names, categories, and base prices.
        """
        cafe_id = _resolve_cafe_id(cafe_id)
        if cafe_id == 0:
            return "ERROR: A valid cafe_id is required. Call get_my_cafes first to find your cafe ID."

        try:
            await _check_cafe_access(cafe_id)
        except UnauthorizedException as e:
            return str(e)

        try:
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
        except Exception as e:
            return f"Error loading menu: {str(e)}"

    async def search_menu(cafe_id: int = 0, query: str = "") -> str:
        """
        [SUPER_ADMIN, CAFE_OWNER] Search for a menu item by name in a specific cafe. Handles typos.
        """
        cafe_id = _resolve_cafe_id(cafe_id)
        if cafe_id == 0:
            return "ERROR: A valid cafe_id is required. Call get_my_cafes first to find your cafe ID."

        try:
            await _check_cafe_access(cafe_id)
        except UnauthorizedException as e:
            return str(e)

        try:
            items = await db.mastermenuitem.find_many(
                where={"cafeId": cafe_id, "isDeleted": False},
                include={"category": True}
            )
            if not items:
                return f"No menu items found for cafe {cafe_id}."

            if not query.strip():
                return await get_menu(cafe_id)

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
        except Exception as e:
            return f"Error searching menu: {str(e)}"

    async def create_master_item(name: str, base_price: float, cafe_id: int = 0, description: str = "", category_id: int = 0) -> str:
        """
        [CAFE_OWNER, SUPER_ADMIN] Create a new item on the master menu for a cafe.
        - name: the item name (required).
        - base_price: the base price in dollars (required, must be > 0).
        - cafe_id: the cafe to add the item to (defaults to your cafe if you manage 1).
        - description: optional description.
        - category_id: optional category ID.
        """
        cafe_id = _resolve_cafe_id(cafe_id)
        if cafe_id == 0:
            return "ERROR: A valid cafe_id is required. Call get_my_cafes first."

        try:
            await _check_cafe_access(cafe_id)
        except UnauthorizedException as e:
            return str(e)

        if base_price <= 0:
            return "Error: base_price must be greater than 0."

        try:
            from app.modules.menu import service as menu_service
            from decimal import Decimal
            result = await menu_service.create_master_item(
                cafe_id=cafe_id,
                name=name,
                description=description or None,
                base_price=Decimal(str(base_price)),
                category_id=category_id if category_id else None,
                user_id=user_id,
            )
            return f"Master menu item created! ID: {result.id}, Name: {result.name}, Base Price: ${result.basePrice}."
        except Exception as e:
            return f"Error creating menu item: {str(e)}"

    async def update_master_item(item_id: int, cafe_id: int = 0, name: str = "", base_price: float = 0.0, description: str = "") -> str:
        """
        [CAFE_OWNER, SUPER_ADMIN] Update an existing master menu item's name, price, or description.
        - item_id: the ID of the master menu item to update.
        - cafe_id: the cafe that owns the item.
        - name: new name (leave empty to not change).
        - base_price: new base price (0.0 to not change).
        - description: new description.
        """
        cafe_id = _resolve_cafe_id(cafe_id)
        if cafe_id == 0:
            return "ERROR: A valid cafe_id is required."

        try:
            await _check_cafe_access(cafe_id)
        except UnauthorizedException as e:
            return str(e)

        from app.modules.menu import service as menu_service
        from decimal import Decimal
        data = {}
        if name.strip():
            data["name"] = name.strip()
        if base_price > 0:
            data["base_price"] = Decimal(str(base_price))
        if description.strip():
            data["description"] = description.strip()

        if not data:
            return "No changes specified. Provide at least one of: name, base_price, or description."

        try:
            result = await menu_service.update_master_item(cafe_id, item_id, data, user_id)
            return f"Menu item {item_id} updated. Name: {result.name}, Base Price: ${result.basePrice}."
        except Exception as e:
            return f"Error updating item: {str(e)}"

    async def delete_master_item(item_id: int, cafe_id: int = 0) -> str:
        """
        [CAFE_OWNER, SUPER_ADMIN] Soft-delete (remove) a master menu item from a cafe.
        - item_id: the ID of the master menu item to delete.
        - cafe_id: the cafe that owns the item.
        """
        cafe_id = _resolve_cafe_id(cafe_id)
        if cafe_id == 0:
            return "ERROR: A valid cafe_id is required."

        try:
            await _check_cafe_access(cafe_id)
        except UnauthorizedException as e:
            return str(e)

        from app.modules.menu import service as menu_service
        try:
            await menu_service.soft_delete_master_item(cafe_id, item_id, user_id)
            return f"Master menu item {item_id} has been deleted from cafe {cafe_id}."
        except Exception as e:
            return f"Error deleting item: {str(e)}"

    # ── BRANCH MENU TOOLS (BRANCH_MANAGER) ───────────────────────────────────

    async def get_branch_inventory(branch_id: int = 0) -> str:
        """
        [ALL ROLES] Get the current inventory and menu items for a specific branch.
        Returns Branch Item IDs, master item IDs, names, quantities, and stock status.
        """
        branch_id = _resolve_branch_id(branch_id)
        if branch_id == 0:
            return "ERROR: A valid branch_id is required."

        try:
            await _check_branch_access(branch_id)
        except UnauthorizedException as e:
            return str(e)

        try:
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
                price = f"${item.priceOverride}" if item.priceOverride else f"${item.masterItem.basePrice} (base)"
                lines.append(
                    f"- Branch Item ID: {item.id} | Master Item ID: {item.masterItemId}"
                    f" | Name: {item.masterItem.name} | Price: {price} | Qty: {qty} ({stock})"
                )
            return f"Inventory for Branch {branch_id}:\n" + "\n".join(lines)
        except Exception as e:
            return f"Error fetching branch inventory: {str(e)}"

    async def add_branch_menu_item(master_item_id: int, branch_id: int = 0, quantity: int = 0, price_override: float = 0.0) -> str:
        """
        [BRANCH_MANAGER] Activate a master menu item on this branch, setting its quantity and optional price override.
        - master_item_id: the master menu item ID.
        - branch_id: the branch to add the item to.
        - quantity: stock quantity (0 = unlimited).
        - price_override: branch price in dollars (0.0 = use base price).
        """
        branch_id = _resolve_branch_id(branch_id)
        if branch_id == 0:
            return "ERROR: A valid branch_id is required."

        try:
            await _check_branch_access(branch_id)
        except UnauthorizedException as e:
            return str(e)

        from app.modules.menu import service as menu_service
        from decimal import Decimal
        try:
            override = Decimal(str(price_override)) if price_override > 0 else None
            qty = quantity if quantity > 0 else None
            result = await menu_service.set_branch_menu_item(
                branch_id=branch_id,
                master_item_id=master_item_id,
                price_override=override,
                is_in_stock=True,
                available_quantity=qty,
                user_id=user_id,
            )
            name = result.masterItem.name if result.masterItem else f"Item {master_item_id}"
            qty_str = str(quantity) if quantity > 0 else "Unlimited"
            price_str = f"${price_override}" if price_override > 0 else "base price"
            return f"Successfully added '{name}' to branch {branch_id}. Quantity: {qty_str}, Price: {price_str}."
        except Exception as e:
            return f"Error adding item to branch: {str(e)}"

    async def update_branch_menu_item(branch_item_id: int, branch_id: int = 0, quantity: int = -1, price_override: float = -1.0, in_stock: str = "") -> str:
        """
        [BRANCH_MANAGER] Update an existing branch menu item's quantity, price override, or stock status.
        - branch_item_id: the Branch Item ID (from get_branch_inventory).
        - branch_id: the branch that owns the item.
        - quantity: new stock quantity (-1 to not change, 0 for unlimited).
        - price_override: new branch price in dollars (-1.0 to not change).
        - in_stock: set stock status — pass 'true' or 'false' (empty to not change).
        """
        branch_id = _resolve_branch_id(branch_id)
        if branch_id == 0:
            return "ERROR: A valid branch_id is required."

        try:
            await _check_branch_access(branch_id)
        except UnauthorizedException as e:
            return str(e)

        from app.modules.menu import service as menu_service
        from decimal import Decimal
        data = {}
        if quantity >= 0:
            data["available_quantity"] = quantity if quantity > 0 else None
            data["is_in_stock"] = quantity > 0
        if price_override >= 0:
            data["price_override"] = Decimal(str(price_override)) if price_override > 0 else None
        if in_stock.lower() in ("true", "false"):
            data["is_in_stock"] = in_stock.lower() == "true"

        if not data:
            return "No changes specified. Provide at least one of: quantity, price_override, or in_stock."

        try:
            await menu_service.patch_branch_menu_item(branch_id, branch_item_id, data, user_id)
            return f"Branch menu item {branch_item_id} updated successfully."
        except Exception as e:
            return f"Error updating branch item: {str(e)}"

    async def remove_branch_menu_item(branch_item_id: int, branch_id: int = 0) -> str:
        """
        [BRANCH_MANAGER] Remove (deactivate) an item from this branch's menu.
        - branch_item_id: the Branch Item ID from get_branch_inventory.
        - branch_id: the branch that owns the item.
        """
        branch_id = _resolve_branch_id(branch_id)
        if branch_id == 0:
            return "ERROR: A valid branch_id is required."

        try:
            await _check_branch_access(branch_id)
        except UnauthorizedException as e:
            return str(e)

        from app.modules.menu import service as menu_service
        try:
            await menu_service.patch_branch_menu_item(branch_id, branch_item_id, {"is_active": False}, user_id)
            return f"Item {branch_item_id} has been removed from branch {branch_id}'s menu."
        except Exception as e:
            return f"Error removing item: {str(e)}"

    async def upsert_inventory_quantity(branch_item_id: int, quantity: int, branch_id: int = 0) -> str:
        """
        [BRANCH_MANAGER] Quickly update ONLY the available quantity of an existing branch menu item.
        - branch_item_id: the Branch Item ID from get_branch_inventory.
        - quantity: the new stock quantity.
        - branch_id: the branch that owns the item.
        """
        branch_id = _resolve_branch_id(branch_id)
        if branch_id == 0:
            return "ERROR: A valid branch_id is required."

        try:
            await _check_branch_access(branch_id)
        except UnauthorizedException as e:
            return str(e)

        try:
            item = await db.branchmenuitem.find_unique(where={"id": branch_item_id})
            if not item or item.branchId != branch_id:
                return (
                    f"Branch menu item {branch_item_id} not found in branch {branch_id}. "
                    "Use get_branch_inventory to find the correct Branch Item ID."
                )

            await db.branchmenuitem.update(
                where={"id": branch_item_id},
                data={"availableQuantity": quantity, "isInStock": quantity > 0}
            )
            return f"Successfully updated item {branch_item_id} quantity to {quantity}."
        except Exception as e:
            return f"Error updating item quantity: {str(e)}"

    if role in ["SUPER_ADMIN", "CAFE_OWNER"]:
        tools.extend([get_menu, search_menu, create_master_item, update_master_item, delete_master_item, get_branch_inventory])
    elif role == "BRANCH_MANAGER":
        tools.extend([get_branch_inventory, add_branch_menu_item, update_branch_menu_item, remove_branch_menu_item, upsert_inventory_quantity])
    elif role == "STAFF":
        tools.extend([get_branch_inventory])

    return tools
