"""
whatsapp_service.py
WhatsApp Order Processing & Dispatch Service.
Fuzzy-matches parsed items against branch catalog, calls orders.service.place_order,
triggers zero-latency KDS WebSocket push, and formats WhatsApp receipt messages.
"""

import os
import httpx
from decimal import Decimal
import logging
from typing import Dict, Any, List, Optional

from app.database import db
from app.modules.orders import service as orders_service
from app.modules.orders import repository as orders_repo
from app.modules.orders.schemas import OrderItemCreate
from app.modules.webhooks.schemas import ParsedWhatsAppOrder, WhatsAppOrderResponse
from app.modules.webhooks.whatsapp_parser import parse_customer_message

logger = logging.getLogger("webhooks.whatsapp.service")


async def send_meta_whatsapp_message(
    to_phone: str,
    message_text: str,
    phone_number_id: Optional[str] = None,
) -> bool:
    """
    Send an outbound message directly to customer's WhatsApp using Meta WhatsApp Cloud API.
    Uses https://graph.facebook.com/v19.0/{phone_number_id}/messages
    """
    token = os.getenv("META_WHATSAPP_TOKEN")
    phone_id = phone_number_id or os.getenv("META_PHONE_NUMBER_ID")

    if not token or not phone_id or not to_phone:
        logger.debug("Meta WhatsApp token or phone ID not configured, skipping outbound Graph API call.")
        return False

    url = f"https://graph.facebook.com/v19.0/{phone_id}/messages"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": to_phone,
        "type": "text",
        "text": {"body": message_text},
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code in [200, 201]:
                logger.info(f"Meta WhatsApp reply successfully sent to {to_phone}")
                return True
            else:
                logger.warning(f"Meta WhatsApp send failed: {resp.status_code} - {resp.text}")
                return False
    except Exception as e:
        logger.warning(f"Error calling Meta WhatsApp Graph API: {e}")
        return False


async def send_waha_whatsapp_message(
    chat_id: str,
    message_text: str,
    waha_url: Optional[str] = None,
    buttons: Optional[List[Dict[str, str]]] = None,
) -> bool:
    """
    Send an outbound message directly to customer's WhatsApp using WAHA (WhatsApp HTTP API).
    Uses POST /api/sendText for guaranteed universal message delivery across all WhatsApp iOS, Android, and Web versions.
    """
    base_url = waha_url or os.getenv("WAHA_API_URL", "http://localhost:3008")
    clean_id = chat_id.strip()

    # If pure phone number without domain, normalize and append @c.us
    if "@" not in clean_id:
        clean_id = clean_id.replace("+", "").replace(" ", "").replace("-", "")
        clean_id = f"{clean_id}@c.us"

    url = f"{base_url.rstrip('/')}/api/sendText"
    payload = {
        "chatId": clean_id,
        "text": message_text,
        "session": "default",
    }
    logger.info(f"Dispatching WAHA WhatsApp text message to {clean_id}...")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code in [200, 201]:
                logger.info(f"WAHA WhatsApp message successfully sent to {clean_id}")
                return True
            else:
                logger.error(f"WAHA send response error: {resp.status_code} - {resp.text}")
                return False
    except Exception as e:
        logger.error(f"Error dispatching WAHA message: {e}")
        return False


async def process_whatsapp_order(
    message_text: str,
    customer_name: Optional[str] = None,
    customer_phone: Optional[str] = None,
    branch_id: int = 1,
) -> WhatsAppOrderResponse:
    """
    Full pipeline:
    1. Parse natural language with Groq GPT-OSS-120B.
    2. Route intent (ORDER, MENU_INQUIRY, ORDER_STATUS, HELP).
    3. Match items against DB and place order via orders_service.
    4. Auto-broadcasts to Kitchen KDS via WebSockets.
    5. Formats WhatsApp receipt response.
    """
    parsed = await parse_customer_message(message_text, default_branch_id=branch_id)
    target_branch_id = parsed.branch_id or branch_id

    # Dynamic Customer Name Resolution:
    # 1. Prefer name explicitly introduced in the current message (e.g. "I am Ali", "Sam here")
    if parsed.customer_name and parsed.customer_name.strip():
        customer_name = parsed.customer_name.strip()

    # 2. If name is not provided in payload or message, check previous order history for this phone
    if (not customer_name or customer_name.strip().lower() in ["valued guest", "valued customer", "whatsapp customer", "customer"]) and customer_phone:
        try:
            prev_order = await db.order.find_first(
                where={"customerPhone": customer_phone, "customerName": {"not": None}},
                order={"createdAt": "desc"},
            )
            if prev_order and prev_order.customerName and prev_order.customerName.strip():
                prev_candidate = prev_order.customerName.strip()
                if prev_candidate.lower() not in ["valued guest", "valued customer", "whatsapp customer", "customer"]:
                    customer_name = prev_candidate
        except Exception as e:
            logger.debug(f"Could not retrieve previous customer name: {e}")

    # Sanitize customer_name (strip any placeholders)
    if customer_name:
        customer_name = customer_name.strip()
        if customer_name.lower() in ["valued guest", "valued customer", "whatsapp customer", "customer", "null", "undefined", "none"]:
            customer_name = None

    branch = await db.branch.find_unique(where={"id": target_branch_id}, include={"cafe": True})
    branch_name = branch.name if branch else f"Branch #{target_branch_id}"

    # 1. Handle Kitchen Queue Inquiry
    if parsed.intent == "QUEUE_STATUS":
        queue_summary = await orders_repo.get_branch_queue_summary(target_branch_id)
        total_q = queue_summary["total_active"]
        wait_m = queue_summary["estimated_wait_minutes"]
        in_prep = queue_summary["in_prep_count"]
        pending = queue_summary["pending_count"]

        reply = (
            f"📊 *Kitchen Queue Status* ({branch_name})\n\n"
            f"• Active orders in preparation: *{total_q}*\n"
            f"  - On espresso bar: {in_prep}\n"
            f"  - Queued for prep: {pending}\n"
            f"• Estimated wait time for new orders: *~{wait_m} minutes*\n\n"
            f"Ready to order? Just reply with what you'd like, e.g.:\n"
            f"👉 _\"Can I get 2 Spanish Lattes and 1 Croissant?\"_"
        )
        buttons = [
            {"id": "btn_view_menu", "text": "📜 View Menu"},
            {"id": "btn_recommendations", "text": "⭐ House Favorites"},
        ]
        return WhatsAppOrderResponse(
            status="QUEUE_INFO",
            branch_id=target_branch_id,
            reply_message=reply,
            buttons=buttons,
            prep_time_minutes=wait_m,
        )

    # 2a. Handle Order Cancellation Request (Step 1: Ask for Confirmation with Yes/No buttons)
    if parsed.intent == "CANCEL_ORDER":
        order_to_cancel = None
        if parsed.order_id_reference:
            order_to_cancel = await db.order.find_first(
                where={"id": parsed.order_id_reference, "branchId": target_branch_id},
                include={"orderItems": {"include": {"branchMenuItem": {"include": {"masterItem": True}}}}},
            )

        if not order_to_cancel and customer_phone:
            active_orders = await orders_repo.get_active_orders_by_customer(target_branch_id, customer_phone)
            if active_orders:
                order_to_cancel = active_orders[0]

        if not order_to_cancel or order_to_cancel.status == "CANCELLED":
            reply = (
                f"You don't have any active pending orders right now.\n\n"
                f"Would you like to view our menu or place a new order? Reply with *'menu'* anytime!"
            )
            buttons = [
                {"id": "btn_view_menu", "text": "📜 View Menu"},
                {"id": "btn_queue_status", "text": "⏳ Check Queue"},
            ]
            return WhatsAppOrderResponse(status="NOT_FOUND", branch_id=target_branch_id, reply_message=reply, buttons=buttons)

        if order_to_cancel.status == "IN_PREPARATION":
            reply = (
                f"⚠️ *Order #{order_to_cancel.id} is already in preparation!* \n\n"
                f"Our barista is currently brewing your items on the bar. If you need to urgently modify or cancel, please speak directly to the counter barista."
            )
            buttons = [
                {"id": "btn_track_status", "text": "🔍 Track Status"},
                {"id": "btn_queue_status", "text": "⏳ Check Queue"},
            ]
            return WhatsAppOrderResponse(status="IN_PREPARATION", branch_id=target_branch_id, reply_message=reply, buttons=buttons)

        if order_to_cancel.status == "COMPLETED":
            reply = (
                f"Order #{order_to_cancel.id} has already been completed and is ready at the counter for pickup."
            )
            buttons = [
                {"id": "btn_view_menu", "text": "📜 View Menu"},
                {"id": "btn_queue_status", "text": "⏳ Check Queue"},
            ]
            return WhatsAppOrderResponse(status="COMPLETED", branch_id=target_branch_id, reply_message=reply, buttons=buttons)

        # Active PENDING order found: Prompt with Yes/No Confirmation Buttons!
        item_lines = [f"• {it.quantity}x {it.branchMenuItem.masterItem.name}" for it in order_to_cancel.orderItems]
        items_str = "\n".join(item_lines) if item_lines else "Your ordered items"

        reply = (
            f"❓ *Confirm Order Cancellation*\n\n"
            f"Are you sure you want to cancel your active order?\n"
            f"• *Order #{order_to_cancel.id} Status:* ⏳ Queued\n"
            f"• *Items:*\n{items_str}\n"
            f"• *Total:* ${order_to_cancel.totalAmount:.2f}\n\n"
            f"Please reply with:\n"
            f"1️⃣ *Yes* (cancel order)\n"
            f"2️⃣ *No* (keep order)\n\n"
            f"_(Or simply reply *1* or *2*)_"
        )
        buttons = [
            {"id": "confirm_cancel_yes", "text": "✅ Yes, Cancel"},
            {"id": "confirm_cancel_no", "text": "❌ No, Keep Order"},
        ]
        return WhatsAppOrderResponse(
            status="CONFIRM_CANCELLATION",
            order_id=order_to_cancel.id,
            branch_id=target_branch_id,
            total_amount=float(order_to_cancel.totalAmount),
            reply_message=reply,
            buttons=buttons,
        )

    # 2b. Handle Confirmed Cancellation (User tapped "Yes, Cancel" or typed "yes")
    if parsed.intent == "CONFIRM_CANCEL_YES":
        order_to_cancel = None
        if customer_phone:
            active_orders = await orders_repo.get_active_orders_by_customer(target_branch_id, customer_phone)
            if active_orders:
                order_to_cancel = active_orders[0]

        if not order_to_cancel:
            reply = (
                f"You don't have any active orders to cancel right now.\n\n"
                f"Would you like to check out our menu?"
            )
            buttons = [
                {"id": "btn_view_menu", "text": "📜 View Menu"},
                {"id": "btn_queue_status", "text": "⏳ Check Queue"},
            ]
            return WhatsAppOrderResponse(status="NOT_FOUND", branch_id=target_branch_id, reply_message=reply, buttons=buttons)

        # Cancel the order and restore stock
        cancelled = await orders_repo.update_order_status(order_to_cancel.id, "CANCELLED", user_id=None)

        # Broadcast cancel event to KDS via WebSockets
        try:
            from app.modules.realtime.manager import order_ws_manager
            await order_ws_manager.broadcast_to_branch(
                branch_id=target_branch_id,
                event_type="ORDER_CANCELLED",
                payload={"order_id": order_to_cancel.id, "reason": "Customer cancelled via WhatsApp"},
            )
        except Exception as e:
            logger.debug(f"KDS cancel broadcast skipped: {e}")

        reply = (
            f"❌ *Order #{order_to_cancel.id} Cancelled*\n\n"
            f"Your order has been cancelled successfully and removed from our kitchen queue. No charges were made.\n\n"
            f"We hope to serve you again soon! What would you like to do next?"
        )
        buttons = [
            {"id": "btn_view_menu", "text": "📜 View Menu"},
            {"id": "btn_queue_status", "text": "⏳ Check Queue"},
        ]
        return WhatsAppOrderResponse(
            status="CANCELLED",
            order_id=order_to_cancel.id,
            branch_id=target_branch_id,
            reply_message=reply,
            buttons=buttons,
        )

    # 2c. Handle Cancellation Declined (User tapped "No, Keep Order" or typed "no")
    if parsed.intent == "CONFIRM_CANCEL_NO":
        order_to_keep = None
        if customer_phone:
            active_orders = await orders_repo.get_active_orders_by_customer(target_branch_id, customer_phone)
            if active_orders:
                order_to_keep = active_orders[0]

        if order_to_keep:
            reply = (
                f"👍 *Order Kept Active!*\n\n"
                f"Your *Order #{order_to_keep.id}* remains active in our kitchen queue. Our barista will have it ready for you shortly!"
            )
            buttons = [
                {"id": "btn_track_status", "text": "🔍 Track Status"},
                {"id": "btn_queue_status", "text": "⏳ Check Queue"},
            ]
        else:
            reply = "No changes were made. How can we help you today?"
            buttons = [
                {"id": "btn_view_menu", "text": "📜 View Menu"},
                {"id": "btn_queue_status", "text": "⏳ Check Queue"},
            ]

        return WhatsAppOrderResponse(status="ACTIVE_KEPT", branch_id=target_branch_id, reply_message=reply, buttons=buttons)

    # 3. Handle Personal Order Status
    if parsed.intent == "MY_ORDER_STATUS":
        order_found = None
        if parsed.order_id_reference:
            order_found = await db.order.find_first(
                where={"id": parsed.order_id_reference, "branchId": target_branch_id},
                include={"orderItems": {"include": {"branchMenuItem": {"include": {"masterItem": True}}}}},
            )
        if not order_found and customer_phone:
            active_orders = await orders_repo.get_active_orders_by_customer(target_branch_id, customer_phone)
            if active_orders:
                order_found = active_orders[0]

        if order_found:
            status_desc = {
                "PENDING": "⏳ Queued (waiting for barista to begin)",
                "IN_PREPARATION": "☕ In Preparation (being freshly brewed)",
                "COMPLETED": "✅ Ready for Pickup at the counter!",
                "CANCELLED": "❌ Cancelled",
            }.get(order_found.status, order_found.status)

            item_lines = []
            for it in order_found.orderItems:
                item_lines.append(f"• {it.quantity}x {it.branchMenuItem.masterItem.name}")
            item_str = "\n".join(item_lines) or "Specialty Items"

            reply = (
                f"🧾 *Order #{order_found.id} Status*\n"
                f"📍 Branch: {branch_name}\n"
                f"Status: *{status_desc}*\n\n"
                f"Items:\n{item_str}\n\n"
                f"💵 Total: ${order_found.totalAmount:.2f}"
            )
            buttons = [
                {"id": "btn_cancel_order", "text": "❌ Cancel Order"},
                {"id": "btn_queue_status", "text": "⏳ Kitchen Queue"},
            ]
        else:
            reply = "You don't have any recent orders. Reply with what you'd like to order today!"
            buttons = [
                {"id": "btn_view_menu", "text": "📜 View Menu"},
                {"id": "btn_queue_status", "text": "⏳ Check Queue"},
            ]

        return WhatsAppOrderResponse(
            status="STATUS",
            order_id=order_found.id if order_found else None,
            branch_id=target_branch_id,
            reply_message=reply,
            buttons=buttons,
        )

    # 4. Handle Categorized Menu Inquiries & Specific Item Questions
    if parsed.intent == "MENU_INQUIRY":
        branch_items = await db.branchmenuitem.find_many(
            where={"branchId": target_branch_id, "isActive": True},
            include={"masterItem": {"include": {"category": True}}},
            order={"id": "asc"},
        )

        # Check if the customer asked about a specific item (e.g. "How much latte do you have", "price of croissant")
        inquiry_target = parsed.inquiry_topic
        if not inquiry_target:
            lower_query = message_text.lower()
            for bi in branch_items:
                if bi.masterItem.name.lower() in lower_query:
                    inquiry_target = bi.masterItem.name
                    break

        if inquiry_target:
            matched_bi = _find_best_menu_match(inquiry_target, branch_items)
            if matched_bi:
                price = matched_bi.priceOverride if matched_bi.priceOverride is not None else matched_bi.masterItem.basePrice
                avail = matched_bi.availableQuantity
                is_out = not matched_bi.isInStock or (avail is not None and avail <= 0)
                status_str = "⚠️ *Currently Sold Out*" if is_out else (f"✅ *In Stock* (~{avail} available)" if avail is not None else "✅ *In Stock & Freshly Brewed*")
                cat_name = matched_bi.masterItem.category.name if matched_bi.masterItem.category else "Specialty Bar"
                desc = matched_bi.masterItem.description or "Handcrafted freshly by our baristas."

                order_cta = f"🛒 *To order, reply:*\n👉 _\"Send 1 {matched_bi.masterItem.name}\"_" if not is_out else "Would you like to try our *Latte* ($4.00) or *Americano* ($3.00) instead?"

                reply = (
                    f"☕ *{matched_bi.masterItem.name}* ({branch_name})\n\n"
                    f"• *Price:* ${price:.2f}\n"
                    f"• *Category:* {cat_name}\n"
                    f"• *Status:* {status_str}\n"
                    f"• *Description:* {desc}\n\n"
                    f"{order_cta}"
                )
                buttons = [
                    {"id": "btn_view_menu", "text": "📜 View Full Menu"},
                    {"id": "btn_queue_status", "text": "⏳ Check Queue"},
                ]
                return WhatsAppOrderResponse(status="MENU", branch_id=target_branch_id, reply_message=reply, buttons=buttons)

        # General Full Menu listing
        categories_map: Dict[str, List[str]] = {}
        for bi in branch_items:
            cat_name = bi.masterItem.category.name if bi.masterItem.category else "Specialties"
            price = bi.priceOverride if bi.priceOverride is not None else bi.masterItem.basePrice
            is_sold_out = not bi.isInStock or (bi.availableQuantity is not None and bi.availableQuantity <= 0)
            tag = " _(Sold Out)_" if is_sold_out else ""
            if cat_name not in categories_map:
                categories_map[cat_name] = []
            categories_map[cat_name].append(f"• {bi.masterItem.name} — ${price:.2f}{tag}")

        menu_sections = []
        for cat, items in categories_map.items():
            cat_lower = cat.lower()
            icon = "☕" if any(w in cat_lower for w in ["coffee", "espresso", "latte", "brew"]) else ("🥐" if any(w in cat_lower for w in ["pastry", "bakery", "cake", "muffin"]) else "🥪")
            menu_sections.append(f"*{icon} {cat}*\n" + "\n".join(items))

        menu_text = "\n\n".join(menu_sections) if menu_sections else (
            "☕ *Specialty Coffee*\n• Spanish Latte — $4.75\n• Americano — $3.25\n• Nitro Cold Brew — $4.75\n\n"
            "🥐 *Bakery & Food*\n• Butter Croissant — $3.50\n• Blueberry Muffin — $3.75\n• Grilled Chicken Panini — $7.50"
        )

        reply = (
            f"📜 *Haji Cafe Menu* ({branch_name})\n\n"
            f"{menu_text}\n\n"
            f"🛒 *How to order:* Just type naturally!\n"
            f"👉 _\"Send 1 Nitro Cold Brew and 1 Butter Croissant for pickup.\"_"
        )
        buttons = [
            {"id": "btn_recommendations", "text": "⭐ House Favorites"},
            {"id": "btn_queue_status", "text": "⏳ Check Queue"},
        ]
        return WhatsAppOrderResponse(status="MENU", branch_id=target_branch_id, reply_message=reply, buttons=buttons)

    # 5. Handle Recommendations
    if parsed.intent == "RECOMMENDATION":
        reply = (
            f"⭐ *Haji Cafe House Favorites* ({branch_name}):\n\n"
            f"1. ☕ *Spanish Latte ($4.75)* — Our signature drink with rich espresso, condensed milk, and velvety foam.\n"
            f"2. 🥐 *Butter Croissant ($3.50)* — Classic Parisian flaky pastry baked fresh every morning.\n"
            f"3. 🧊 *Nitro Cold Brew ($4.50)* — Steeped 18 hours, infused with nitrogen for a silky-smooth finish.\n"
            f"4. 🥪 *Chicken Pesto Panini ($7.50)* — Grilled artisan sourdough with fresh mozzarella and basil pesto.\n\n"
            f"Ready to order? Just reply with your choice!"
        )
        buttons = [
            {"id": "btn_view_menu", "text": "📜 View Full Menu"},
            {"id": "btn_queue_status", "text": "⏳ Check Queue"},
        ]
        return WhatsAppOrderResponse(status="RECOMMENDATION", branch_id=target_branch_id, reply_message=reply, buttons=buttons)

    # 6. Handle Store Info
    if parsed.intent == "STORE_INFO":
        loc = branch.location if branch and branch.location else "Main Boulevard, Downtown"
        reply = (
            f"☕ *Haji Cafe Information* ({branch_name}):\n\n"
            f"• 📍 *Location:* {loc}\n"
            f"• ⏰ *Hours:* Open Daily from 7:00 AM – 11:00 PM\n"
            f"• 📶 *Wi-Fi:* Free High-Speed Wi-Fi available for all guests\n"
            f"• 🚗 *Service:* Dine-in, Takeaway & Express WhatsApp Counter Pickup\n\n"
            f"Can I get an order started for you? Reply anytime!"
        )
        buttons = [
            {"id": "btn_view_menu", "text": "📜 View Menu"},
            {"id": "btn_queue_status", "text": "⏳ Check Queue"},
        ]
        return WhatsAppOrderResponse(status="STORE_INFO", branch_id=target_branch_id, reply_message=reply, buttons=buttons)

    # 7. General Greetings / Help
    if not parsed.items or parsed.intent == "HELP":
        greeting_line = f"👋 Hello {customer_name}! Welcome to Haji Cafe ({branch_name})." if customer_name else f"👋 Hello and welcome to Haji Cafe ({branch_name})!"
        reply = (
            f"{greeting_line}\n\n"
            f"Here is how I can help you today:\n"
            f"• 🛍️ *Order:* _\"Can I get 2 Spanish Lattes and 1 Croissant?\"_\n"
            f"• 📜 *Menu:* _\"Show me the menu\"_\n"
            f"• ⏳ *Queue:* _\"How many orders are in queue?\"_\n"
            f"• 🔍 *Status:* _\"Where is my order?\"_\n"
            f"• ❌ *Cancel:* _\"Cancel my order\"_\n\n"
            f"What would you like to enjoy today?"
        )
        buttons = [
            {"id": "btn_view_menu", "text": "📜 View Menu"},
            {"id": "btn_queue_status", "text": "⏳ Check Queue"},
        ]
        return WhatsAppOrderResponse(
            status="HELP",
            branch_id=target_branch_id,
            reply_message=reply,
            buttons=buttons,
        )

    # Enforce Single Active Order Rule: A customer may only have 1 active order at a time
    if customer_phone:
        existing_active_orders = await orders_repo.get_active_orders_by_customer(
            branch_id=target_branch_id,
            customer_phone=customer_phone,
        )
        if existing_active_orders:
            active_order = existing_active_orders[0]
            status_desc = {
                "PENDING": "⏳ Queued (waiting for barista to begin)",
                "IN_PREPARATION": "☕ In Preparation (being brewed on the espresso bar)",
            }.get(active_order.status, active_order.status)

            item_lines = []
            for it in active_order.orderItems:
                item_lines.append(f"• {it.quantity}x {it.branchMenuItem.masterItem.name}")
            items_str = "\n".join(item_lines) if item_lines else "Specialty Items"

            reply = (
                f"⚠️ *You already have an active order in progress!*\n\n"
                f"• *Order #{active_order.id}:* {status_desc}\n"
                f"• *Items:*\n{items_str}\n"
                f"• *Total:* ${active_order.totalAmount:.2f}\n\n"
                f"To keep our kitchen running smoothly, guests can have *one active order at a time*.\n\n"
                f"👉 Once your current order is completed, you can place a new order.\n"
                f"👉 If you'd like to cancel your current order first, simply reply: _\"Cancel my order\"_."
            )
            buttons = [
                {"id": "btn_track_status", "text": "🔍 Track Status"},
                {"id": "btn_cancel_order", "text": "❌ Cancel Current Order"},
            ]
            return WhatsAppOrderResponse(
                status="ACTIVE_ORDER_EXISTS",
                order_id=active_order.id,
                branch_id=target_branch_id,
                total_amount=float(active_order.totalAmount),
                reply_message=reply,
                buttons=buttons,
            )

    # Resolve items against branch inventory
    all_branch_items = await db.branchmenuitem.find_many(
        where={"branchId": target_branch_id, "isActive": True},
        include={"masterItem": True},
    )

    items_to_order: List[OrderItemCreate] = []
    items_summary = []
    out_of_stock_names: List[str] = []
    unrecognized_names: List[str] = []

    for req_item in parsed.items:
        match = _find_best_menu_match(req_item.name, all_branch_items)
        if match:
            avail = match.availableQuantity
            if not match.isInStock or (avail is not None and avail < req_item.quantity):
                out_of_stock_names.append(match.masterItem.name)
                continue
            effective_p = match.priceOverride if match.priceOverride is not None else match.masterItem.basePrice
            items_to_order.append(
                OrderItemCreate(
                    branch_menu_item_id=match.id,
                    quantity=req_item.quantity,
                    notes=req_item.notes,
                )
            )
            items_summary.append({
                "item_name": match.masterItem.name,
                "quantity": req_item.quantity,
                "unit_price": float(effective_p),
                "subtotal": float(effective_p * req_item.quantity),
                "notes": req_item.notes,
            })
        else:
            unrecognized_names.append(req_item.name)

    if not items_to_order:
        if out_of_stock_names:
            items_str = ", ".join(f"*{name}*" for name in out_of_stock_names)
            reply = (
                f"⚠️ Sorry, {items_str} is currently sold out at {branch_name}.\n\n"
                f"Would you like to try something else from our bar?\n"
                f"• *Latte* ($4.00)\n"
                f"• *Americano* ($3.00)\n"
                f"• *Butter Croissant* ($3.50)\n\n"
                f"Reply with an item name to order!"
            )
        elif unrecognized_names:
            items_str = ", ".join(f"\"{name}\"" for name in unrecognized_names)
            reply = (
                f"Sorry, we couldn't find {items_str} on our menu at {branch_name}.\n\n"
                f"Reply with *'menu'* to see our full selection, or order our favorites:\n"
                f"• *Latte* ($4.00)\n"
                f"• *Americano* ($3.00)\n"
                f"• *Butter Croissant* ($3.50)"
            )
        else:
            reply = (
                f"Sorry, we couldn't find the requested items in stock at {branch_name}.\n\n"
                f"Reply with *'menu'* to view our full menu, or reply with an item name to order!"
            )
        buttons = [
            {"id": "btn_view_menu", "text": "📜 View Menu"},
            {"id": "btn_recommendations", "text": "⭐ House Favorites"},
        ]
        return WhatsAppOrderResponse(
            status="UNAVAILABLE",
            branch_id=target_branch_id,
            reply_message=reply,
            buttons=buttons,
        )

    # Create real order in PostgreSQL with customerPhone linked!
    placed_order = await orders_service.place_order(
        branch_id=target_branch_id,
        user_id=None,
        items=items_to_order,
        customer_phone=customer_phone,
        customer_name=customer_name,
    )

    order_id = placed_order.id
    total_amt = float(placed_order.totalAmount)

    # Format WhatsApp Receipt
    lines = []
    for it in items_summary:
        note_str = f" ({it['notes']})" if it.get("notes") else ""
        lines.append(f"• {it['quantity']}x {it['item_name']}{note_str} — ${it['subtotal']:.2f}")

    receipt_items_str = "\n".join(lines)
    cust_line = f"\n👤 Customer: *{customer_name}*" if customer_name else ""
    reply_receipt = (
        f"🎉 Order Confirmed! Order #{order_id}\n"
        f"📍 Branch: {branch_name}{cust_line}\n\n"
        f"Order Summary:\n{receipt_items_str}\n\n"
        f"💵 Total: ${total_amt:.2f}\n"
        f"⏱️ Estimated Prep Time: ~10 minutes\n\n"
        f"Your order is now live on our kitchen display! We'll notify you when it's ready for pickup."
    )

    receipt_buttons = [
        {"id": "btn_track_status", "text": "🔍 Track Status"},
        {"id": "btn_cancel_order", "text": "❌ Cancel Order"},
    ]

    return WhatsAppOrderResponse(
        status="ORDER_PLACED",
        order_id=order_id,
        branch_id=target_branch_id,
        total_amount=total_amt,
        items_placed=items_summary,
        reply_message=reply_receipt,
        buttons=receipt_buttons,
        prep_time_minutes=10,
    )


def _find_best_menu_match(query_name: str, branch_items: list) -> Optional[Any]:
    """Fuzzy case-insensitive matching for menu items."""
    q = query_name.lower().strip()

    # Exact match
    for bi in branch_items:
        if bi.masterItem.name.lower() == q:
            return bi

    # Substring match
    for bi in branch_items:
        m_name = bi.masterItem.name.lower()
        if q in m_name or m_name in q:
            return bi

    # Word overlap match
    q_words = set(q.split())
    best_item = None
    max_overlap = 0
    for bi in branch_items:
        m_words = set(bi.masterItem.name.lower().split())
        overlap = len(q_words.intersection(m_words))
        if overlap > max_overlap:
            max_overlap = overlap
            best_item = bi

    return best_item if max_overlap > 0 else None
