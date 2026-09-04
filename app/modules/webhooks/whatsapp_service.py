"""
whatsapp_service.py
WhatsApp Order Processing & Dispatch Service.
Fuzzy-matches parsed items against branch catalog, calls orders.service.place_order,
triggers zero-latency KDS WebSocket push, and formats WhatsApp receipt messages.
"""

import os
import json
import re
import datetime
import httpx
from decimal import Decimal
import logging
from typing import Dict, Any, List, Optional

from app.database import db
from app.modules.orders import service as orders_service
from app.modules.orders import repository as orders_repo
from app.modules.orders.schemas import OrderItemCreate
from app.modules.webhooks.schemas import ParsedWhatsAppOrder, WhatsAppOrderResponse
from app.modules.webhooks.whatsapp_parser import parse_customer_message, normalize_table_number

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


async def notify_customer_order_status_update(order: Any, new_status: str) -> bool:
    """
    Asynchronously dispatch a context-aware WhatsApp status notification to customer
    when their order transitions in the Kitchen Display System (KDS) or Orders Management.
    Supports:
      - IN_PREPARATION (Dine-in with Table # and barista prep time vs Delivery with Address and kitchen prep time)
      - COMPLETED (Dine-in with table delivery / counter pickup + 1-5 rating prompt vs Delivery courier dispatched + 1-5 rating prompt)
      - CANCELLED (Friendly cancellation notice with cafe staff contact info)
    """
    try:
        customer_phone = getattr(order, "customerPhone", None)
        if not customer_phone:
            return False

        customer_name = getattr(order, "customerName", None) or "Valued Guest"
        order_id = getattr(order, "id", None)
        order_type = (getattr(order, "orderType", None) or "DINE_IN").upper()
        table_number = getattr(order, "tableNumber", None) or "your table"
        delivery_address = getattr(order, "deliveryAddress", None) or "your delivery address"

        # Resolve branch name
        branch = getattr(order, "branch", None)
        branch_name = getattr(branch, "name", None) if branch else "Haji Cafe"

        # Format items list
        items_lines = []
        raw_items = getattr(order, "orderItems", None) or []
        for it in raw_items:
            qty = getattr(it, "quantity", 1)
            b_item = getattr(it, "branchMenuItem", None)
            m_item = getattr(b_item, "masterItem", None) if b_item else None
            item_name = getattr(m_item, "name", "Specialty Item") if m_item else "Specialty Item"
            notes = getattr(it, "notes", None)
            notes_str = f" ({notes})" if notes else ""
            items_lines.append(f"• {qty}x {item_name}{notes_str}")

        items_summary = "\n".join(items_lines) if items_lines else "• Specialty Order Items"

        status_upper = str(new_status).upper()

        if status_upper == "IN_PREPARATION":
            if order_type == "DELIVERY":
                msg = (
                    f"☕ *Order Update: In Preparation!* (Order #{order_id})\n"
                    f"👤 Customer: *{customer_name}*\n"
                    f"📍 Branch: *{branch_name}*\n\n"
                    f"Great news! Our kitchen team has started preparing your order:\n"
                    f"{items_summary}\n\n"
                    f"🛵 *Service:* Delivery\n"
                    f"🏠 *Destination:* {delivery_address}\n"
                    f"⏱️ *Est. Prep Time:* ~10-15 minutes\n\n"
                    f"We'll notify you as soon as your courier is on the way!"
                )
            else:
                msg = (
                    f"☕ *Order Update: In Preparation!* (Order #{order_id})\n"
                    f"👤 Customer: *{customer_name}*\n"
                    f"📍 Branch: *{branch_name}*\n\n"
                    f"Great news! Our barista is now preparing your order:\n"
                    f"{items_summary}\n\n"
                    f"🍽️ *Service:* Dine-in ({table_number})\n"
                    f"⏱️ *Est. Prep Time:* ~5-8 minutes\n\n"
                    f"We will bring your order to *{table_number}* the moment it's ready!"
                )

        elif status_upper == "COMPLETED":
            if order_type == "DELIVERY":
                msg = (
                    f"🛵 *Order Out for Delivery!* (Order #{order_id})\n"
                    f"👤 Customer: *{customer_name}*\n"
                    f"📍 Branch: *{branch_name}*\n\n"
                    f"Your order is freshly packed, sealed, and on its way!\n"
                    f"{items_summary}\n\n"
                    f"🏠 *Delivering To:* {delivery_address}\n"
                    f"⏱️ *Courier:* En route to your address\n\n"
                    f"---\n"
                    f"⭐ *How was your ordering experience?*\n"
                    f"Reply with a rating from *1 to 5* (e.g. *5* or *'Loved it!'*) to let us know!"
                )
            else:
                msg = (
                    f"🎉 *Order Ready!* (Order #{order_id})\n"
                    f"👤 Customer: *{customer_name}*\n"
                    f"📍 Branch: *{branch_name}*\n\n"
                    f"Your order is freshly prepared and ready!\n"
                    f"{items_summary}\n\n"
                    f"🍽️ *Table:* {table_number}\n"
                    f"Our server is bringing your items to *{table_number}* right now (or feel free to collect from the barista bar).\n\n"
                    f"---\n"
                    f"⭐ *How was your coffee & service today?*\n"
                    f"Reply with a rating from *1 to 5* (e.g. *5* or *'Loved it!'*) to let us know!"
                )

        elif status_upper == "CANCELLED":
            msg = (
                f"❌ *Order Update: Cancelled* (Order #{order_id})\n"
                f"👤 Customer: *{customer_name}*\n"
                f"📍 Branch: *{branch_name}*\n\n"
                f"Your order #{order_id} has been cancelled by the cafe team.\n\n"
                f"If you did not request this or would like assistance, please speak with our staff at *{branch_name}* or reply directly here."
            )
        else:
            return False

        logger.info(f"Dispatching WhatsApp status notification [{status_upper}] for Order #{order_id} to {customer_phone}...")

        # Multi-gateway outbound dispatch: WAHA & Meta
        sent_waha = await send_waha_whatsapp_message(chat_id=customer_phone, message_text=msg)
        sent_meta = await send_meta_whatsapp_message(to_phone=customer_phone, message_text=msg)

        return sent_waha or sent_meta
    except Exception as e:
        logger.error(f"Error in notify_customer_order_status_update for order: {e}", exc_info=True)
        return False


DRAFT_TTL_MINUTES = 15


async def get_active_draft(customer_phone: Optional[str]) -> Optional[Any]:
    """Retrieve non-expired draft order for customer phone; cleans up if expired."""
    if not customer_phone:
        return None
    try:
        draft = await db.whatsappdraftorder.find_unique(where={"customerPhone": customer_phone})
        if not draft:
            return None
        now = datetime.datetime.now(datetime.timezone.utc)
        exp = draft.expiresAt
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=datetime.timezone.utc)
        if now > exp:
            await db.whatsappdraftorder.delete(where={"customerPhone": customer_phone})
            return None
        return draft
    except Exception as e:
        logger.debug(f"Could not retrieve draft order for {customer_phone}: {e}")
        return None


async def save_or_update_draft(
    customer_phone: str,
    branch_id: int,
    items_summary: List[Dict[str, Any]],
    total_amount: float,
    state: str = "AWAITING_ORDER_TYPE",
    customer_name: Optional[str] = None,
    order_type: Optional[str] = None,
    table_number: Optional[str] = None,
    delivery_address: Optional[str] = None,
) -> Any:
    """Upsert a draft order with a 15-minute TTL."""
    now = datetime.datetime.now(datetime.timezone.utc)
    expires_at = now + datetime.timedelta(minutes=DRAFT_TTL_MINUTES)
    items_json = json.dumps(items_summary)

    payload: Dict[str, Any] = {
        "branchId": branch_id,
        "itemsJson": items_json,
        "totalAmount": Decimal(str(round(total_amount, 2))),
        "state": state,
        "expiresAt": expires_at,
    }
    if customer_name:
        payload["customerName"] = customer_name
    if order_type:
        payload["orderType"] = order_type
    if table_number:
        payload["tableNumber"] = table_number
    if delivery_address:
        payload["deliveryAddress"] = delivery_address

    try:
        draft = await db.whatsappdraftorder.upsert(
            where={"customerPhone": customer_phone},
            data={
                "create": {
                    "customerPhone": customer_phone,
                    **payload,
                },
                "update": payload,
            },
        )
        return draft
    except Exception as e:
        logger.error(f"Error saving draft order for {customer_phone}: {e}")
        return None


async def delete_draft(customer_phone: Optional[str]) -> bool:
    """Delete draft order for customer phone."""
    if not customer_phone:
        return False
    try:
        await db.whatsappdraftorder.delete_many(where={"customerPhone": customer_phone})
        return True
    except Exception as e:
        logger.debug(f"Error deleting draft for {customer_phone}: {e}")
        return False


def _format_service_choice_prompt(
    branch_name: str,
    customer_name: Optional[str],
    items_summary: List[Dict[str, Any]],
    total_amt: float,
    target_branch_id: int = 1,
) -> WhatsAppOrderResponse:
    lines = []
    for it in items_summary:
        note_str = f" ({it['notes']})" if it.get("notes") else ""
        lines.append(f"• {it['quantity']}x {it['item_name']}{note_str} — ${it['subtotal']:.2f}")
    items_str = "\n".join(lines)
    cust_line = f"👤 Customer: *{customer_name}*\n" if customer_name else ""

    reply = (
        f"🛒 *Your Order Summary* ({branch_name})\n{cust_line}\n"
        f"{items_str}\n\n"
        f"💵 *Total:* ${total_amt:.2f}\n\n"
        f"Would you like this order for *Dine-in* or *Delivery*?\n"
        f"1️⃣ *Dine-in* (at the café table)\n"
        f"2️⃣ *Delivery* (to your address)\n\n"
        f"_(Reply *1* or *Dine in*, or *2* or *Delivery*, or *'cancel'* to cancel)_"
    )
    buttons = [
        {"id": "btn_dine_in", "text": "🍽️ Dine-in"},
        {"id": "btn_delivery", "text": "🛵 Delivery"},
        {"id": "btn_cancel_order", "text": "❌ Cancel"},
    ]
    return WhatsAppOrderResponse(
        status="AWAITING_ORDER_TYPE",
        branch_id=target_branch_id,
        total_amount=total_amt,
        items_placed=items_summary,
        reply_message=reply,
        buttons=buttons,
    )


def _format_table_number_prompt(
    branch_name: str,
    customer_name: Optional[str],
    items_summary: List[Dict[str, Any]],
    total_amt: float,
    target_branch_id: int = 1,
) -> WhatsAppOrderResponse:
    cust_line = f" ({customer_name})" if customer_name else ""
    reply = (
        f"🍽️ *Dine-in Selected!*{cust_line}\n\n"
        f"Please reply with your *Table Number* (e.g., *Table 4* or *4*):\n\n"
        f"_(Or reply *'cancel'* to cancel, or *'delivery'* to switch to delivery)_"
    )
    buttons = [
        {"id": "btn_delivery", "text": "🛵 Switch to Delivery"},
        {"id": "btn_cancel_order", "text": "❌ Cancel"},
    ]
    return WhatsAppOrderResponse(
        status="AWAITING_TABLE_NUMBER",
        branch_id=target_branch_id,
        total_amount=total_amt,
        items_placed=items_summary,
        reply_message=reply,
        buttons=buttons,
        order_type="DINE_IN",
    )


def _format_delivery_address_prompt(
    branch_name: str,
    customer_name: Optional[str],
    items_summary: List[Dict[str, Any]],
    total_amt: float,
    target_branch_id: int = 1,
) -> WhatsAppOrderResponse:
    cust_line = f" ({customer_name})" if customer_name else ""
    reply = (
        f"🛵 *Delivery Selected!*{cust_line}\n\n"
        f"Please reply with your complete *Delivery Address* (street, house #, or landmark):\n\n"
        f"_(Or reply *'cancel'* to cancel, or *'dine in'* to switch to dine-in)_"
    )
    buttons = [
        {"id": "btn_dine_in", "text": "🍽️ Switch to Dine-in"},
        {"id": "btn_cancel_order", "text": "❌ Cancel"},
    ]
    return WhatsAppOrderResponse(
        status="AWAITING_DELIVERY_ADDRESS",
        branch_id=target_branch_id,
        total_amount=total_amt,
        items_placed=items_summary,
        reply_message=reply,
        buttons=buttons,
        order_type="DELIVERY",
    )


def _format_confirmation_ticket(
    branch_name: str,
    customer_name: Optional[str],
    customer_phone: Optional[str],
    items_summary: List[Dict[str, Any]],
    total_amt: float,
    order_type: str,
    table_number: Optional[str] = None,
    delivery_address: Optional[str] = None,
    target_branch_id: int = 1,
) -> WhatsAppOrderResponse:
    lines = []
    for it in items_summary:
        note_str = f" ({it['notes']})" if it.get("notes") else ""
        lines.append(f"• {it['quantity']}x {it['item_name']}{note_str} — ${it['subtotal']:.2f}")
    items_str = "\n".join(lines)

    cust_line = f"👤 *Customer:* {customer_name}\n" if customer_name else ""

    if order_type == "DELIVERY":
        service_lines = f"🛵 *Service:* Delivery\n🏠 *Address:* {delivery_address or 'Pending'}\n"
        est_time = "⏱️ *Est. Delivery Time:* ~25-35 mins"
        prep_m = 30
    else:
        tbl = table_number or "Table 1"
        service_lines = f"🍽️ *Service:* Dine-in ({tbl})\n"
        est_time = "⏱️ *Est. Prep Time:* ~10 mins"
        prep_m = 10

    reply = (
        f"📋 *Please Confirm Your Order*\n\n"
        f"📍 *Branch:* {branch_name}\n"
        f"{service_lines}"
        f"{cust_line}\n"
        f"*Order Items:*\n"
        f"{items_str}\n\n"
        f"💵 *Total:* ${total_amt:.2f}\n"
        f"{est_time}\n\n"
        f"Ready to send this ticket to the kitchen?\n"
        f"1️⃣ *Yes, Place Order*\n"
        f"2️⃣ *Cancel*\n\n"
        f"_(Reply *1* or *Yes* to confirm, or *2* to cancel)_"
    )
    buttons = [
        {"id": "btn_confirm_order_yes", "text": "✅ Yes, Place Order"},
        {"id": "btn_confirm_order_no", "text": "❌ Cancel"},
    ]
    return WhatsAppOrderResponse(
        status="AWAITING_FINAL_CONFIRMATION",
        branch_id=target_branch_id,
        total_amount=total_amt,
        items_placed=items_summary,
        reply_message=reply,
        buttons=buttons,
        order_type=order_type,
        table_number=table_number,
        delivery_address=delivery_address,
        prep_time_minutes=prep_m,
    )


def _format_confirmed_receipt(
    order_id: int,
    branch_name: str,
    customer_name: Optional[str],
    items_summary: List[Dict[str, Any]],
    total_amt: float,
    order_type: str,
    table_number: Optional[str] = None,
    delivery_address: Optional[str] = None,
    target_branch_id: int = 1,
) -> WhatsAppOrderResponse:
    lines = []
    for it in items_summary:
        note_str = f" ({it['notes']})" if it.get("notes") else ""
        lines.append(f"• {it['quantity']}x {it['item_name']}{note_str} — ${it['subtotal']:.2f}")
    items_str = "\n".join(lines)

    cust_line = f"\n👤 Customer: *{customer_name}*" if customer_name else ""

    if order_type == "DELIVERY":
        service_line = f"🛵 Service: *Delivery* to {delivery_address or 'Your Address'}"
        closing = "Your order is now live on our kitchen display! We will dispatch our courier as soon as it is packed."
        est_time = "⏱️ Estimated Delivery Time: ~25-35 minutes"
        prep_m = 30
    else:
        tbl = table_number or "Your Table"
        service_line = f"🍽️ Service: *Dine-in* ({tbl})"
        closing = f"Your order is now live on our kitchen display! We will bring it to {tbl} when ready."
        est_time = "⏱️ Estimated Prep Time: ~10 minutes"
        prep_m = 10

    reply = (
        f"🎉 *Order Confirmed! Order #{order_id}*\n"
        f"📍 Branch: {branch_name}{cust_line}\n"
        f"{service_line}\n\n"
        f"Order Summary:\n{items_str}\n\n"
        f"💵 Total: ${total_amt:.2f}\n"
        f"{est_time}\n\n"
        f"{closing}"
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
        reply_message=reply,
        buttons=receipt_buttons,
        order_type=order_type,
        table_number=table_number,
        delivery_address=delivery_address,
        prep_time_minutes=prep_m,
    )


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

    clean_lower = message_text.strip().lower()
    clean_msg = message_text.strip()

    # ---------------------------------------------------------
    # STATE MACHINE HANDLER: Check if customer has an active draft
    # ---------------------------------------------------------
    active_draft = await get_active_draft(customer_phone) if customer_phone else None
    if active_draft:
        target_branch_id = active_draft.branchId or target_branch_id
        draft_items = json.loads(active_draft.itemsJson) if active_draft.itemsJson else []
        draft_total = float(active_draft.totalAmount)
        draft_name = customer_name or active_draft.customerName

        # Universal Cancellation check while draft is active
        if clean_lower in [
            "cancel", "cancle", "no", "nahi", "stop", "rehne do", "mat karo",
            "btn_confirm_order_no", "btn_cancel_order", "cancel order", "discard"
        ]:
            await delete_draft(customer_phone)
            reply = (
                "❌ *Order Cancelled*\n\n"
                "Your draft order has been cancelled and cleared. No charges were made.\n\n"
                "Feel free to reply with *'menu'* anytime to browse or start fresh!"
            )
            buttons = [
                {"id": "btn_view_menu", "text": "📜 View Menu"},
                {"id": "btn_recommendations", "text": "⭐ House Favorites"},
            ]
            return WhatsAppOrderResponse(
                status="DRAFT_CANCELLED",
                branch_id=target_branch_id,
                reply_message=reply,
                buttons=buttons,
            )

        # STATE 1: AWAITING_ORDER_TYPE
        if active_draft.state == "AWAITING_ORDER_TYPE":
            is_dine = clean_lower in ["1", "1.", "1️⃣", "dine in", "dine-in", "dine", "table", "baith ke", "yahan", "btn_dine_in"] or "dine in" in clean_lower or "table" in clean_lower
            is_deliv = clean_lower in ["2", "2.", "2️⃣", "delivery", "deliver", "ghar", "home", "btn_delivery"] or "deliver" in clean_lower or "ghar" in clean_lower

            if is_dine:
                tbl_m = re.search(r'(?:table\s*(?:no\.?|#)?|t-?)\s*([0-9]+[a-zA-Z]?|[a-zA-Z][0-9]*)', message_text, re.IGNORECASE)
                if tbl_m:
                    tbl = normalize_table_number(tbl_m.group(0))
                    await save_or_update_draft(
                        customer_phone=customer_phone,
                        branch_id=target_branch_id,
                        items_summary=draft_items,
                        total_amount=draft_total,
                        state="AWAITING_FINAL_CONFIRMATION",
                        customer_name=draft_name,
                        order_type="DINE_IN",
                        table_number=tbl,
                    )
                    return _format_confirmation_ticket(
                        branch_name=branch_name,
                        customer_name=draft_name,
                        customer_phone=customer_phone,
                        items_summary=draft_items,
                        total_amt=draft_total,
                        order_type="DINE_IN",
                        table_number=tbl,
                        target_branch_id=target_branch_id,
                    )
                else:
                    await save_or_update_draft(
                        customer_phone=customer_phone,
                        branch_id=target_branch_id,
                        items_summary=draft_items,
                        total_amount=draft_total,
                        state="AWAITING_TABLE_NUMBER",
                        customer_name=draft_name,
                        order_type="DINE_IN",
                    )
                    return _format_table_number_prompt(
                        branch_name=branch_name,
                        customer_name=draft_name,
                        items_summary=draft_items,
                        total_amt=draft_total,
                        target_branch_id=target_branch_id,
                    )

            elif is_deliv:
                addr_m = re.search(r'(?:delivery\s+(?:to|at)|deliver\s+(?:to|at)|2\s+)\s*(.+)', message_text, re.IGNORECASE)
                candidate_addr = addr_m.group(1).strip() if addr_m else None
                if candidate_addr and len(candidate_addr) >= 5 and not candidate_addr.isdigit():
                    await save_or_update_draft(
                        customer_phone=customer_phone,
                        branch_id=target_branch_id,
                        items_summary=draft_items,
                        total_amount=draft_total,
                        state="AWAITING_FINAL_CONFIRMATION",
                        customer_name=draft_name,
                        order_type="DELIVERY",
                        delivery_address=candidate_addr,
                    )
                    return _format_confirmation_ticket(
                        branch_name=branch_name,
                        customer_name=draft_name,
                        customer_phone=customer_phone,
                        items_summary=draft_items,
                        total_amt=draft_total,
                        order_type="DELIVERY",
                        delivery_address=candidate_addr,
                        target_branch_id=target_branch_id,
                    )
                else:
                    await save_or_update_draft(
                        customer_phone=customer_phone,
                        branch_id=target_branch_id,
                        items_summary=draft_items,
                        total_amount=draft_total,
                        state="AWAITING_DELIVERY_ADDRESS",
                        customer_name=draft_name,
                        order_type="DELIVERY",
                    )
                    return _format_delivery_address_prompt(
                        branch_name=branch_name,
                        customer_name=draft_name,
                        items_summary=draft_items,
                        total_amt=draft_total,
                        target_branch_id=target_branch_id,
                    )
            elif not any(w in clean_lower for w in ["timing", "hours", "location", "wifi", "open", "queue", "rush", "menu", "recommend"]):
                reply = (
                    f"Please choose whether you'd like your order for *Dine-in* or *Delivery*:\n\n"
                    f"1️⃣ *Dine-in* (at the café table)\n"
                    f"2️⃣ *Delivery* (to your address)\n\n"
                    f"_(Reply *1* or *Dine in*, or *2* or *Delivery*, or *'cancel'* to cancel)_"
                )
                return WhatsAppOrderResponse(
                    status="AWAITING_ORDER_TYPE",
                    branch_id=target_branch_id,
                    total_amount=draft_total,
                    items_placed=draft_items,
                    reply_message=reply,
                    buttons=[
                        {"id": "btn_dine_in", "text": "🍽️ Dine-in"},
                        {"id": "btn_delivery", "text": "🛵 Delivery"},
                        {"id": "btn_cancel_order", "text": "❌ Cancel"},
                    ],
                )

        # STATE 2: AWAITING_TABLE_NUMBER
        elif active_draft.state == "AWAITING_TABLE_NUMBER":
            if clean_lower in ["2", "delivery", "deliver", "ghar", "btn_delivery"] or "switch to delivery" in clean_lower:
                await save_or_update_draft(
                    customer_phone=customer_phone,
                    branch_id=target_branch_id,
                    items_summary=draft_items,
                    total_amount=draft_total,
                    state="AWAITING_DELIVERY_ADDRESS",
                    customer_name=draft_name,
                    order_type="DELIVERY",
                )
                return _format_delivery_address_prompt(
                    branch_name=branch_name,
                    customer_name=draft_name,
                    items_summary=draft_items,
                    total_amt=draft_total,
                    target_branch_id=target_branch_id,
                )

            if not any(w in clean_lower for w in ["timing", "hours", "location", "wifi", "open", "menu", "recommend"]) and len(message_text.strip()) <= 30:
                tbl = normalize_table_number(message_text)
                await save_or_update_draft(
                    customer_phone=customer_phone,
                    branch_id=target_branch_id,
                    items_summary=draft_items,
                    total_amount=draft_total,
                    state="AWAITING_FINAL_CONFIRMATION",
                    customer_name=draft_name,
                    order_type="DINE_IN",
                    table_number=tbl,
                )
                return _format_confirmation_ticket(
                    branch_name=branch_name,
                    customer_name=draft_name,
                    customer_phone=customer_phone,
                    items_summary=draft_items,
                    total_amt=draft_total,
                    order_type="DINE_IN",
                    table_number=tbl,
                    target_branch_id=target_branch_id,
                )

        # STATE 3: AWAITING_DELIVERY_ADDRESS
        elif active_draft.state == "AWAITING_DELIVERY_ADDRESS":
            if clean_lower in ["1", "dine in", "dine-in", "dine", "table", "btn_dine_in"] or "switch to dine" in clean_lower:
                await save_or_update_draft(
                    customer_phone=customer_phone,
                    branch_id=target_branch_id,
                    items_summary=draft_items,
                    total_amount=draft_total,
                    state="AWAITING_TABLE_NUMBER",
                    customer_name=draft_name,
                    order_type="DINE_IN",
                )
                return _format_table_number_prompt(
                    branch_name=branch_name,
                    customer_name=draft_name,
                    items_summary=draft_items,
                    total_amt=draft_total,
                    target_branch_id=target_branch_id,
                )

            addr_text = message_text.strip()
            if len(addr_text) >= 4 and not any(w in clean_lower for w in ["timing", "hours", "location", "wifi", "open", "menu", "recommend"]):
                await save_or_update_draft(
                    customer_phone=customer_phone,
                    branch_id=target_branch_id,
                    items_summary=draft_items,
                    total_amount=draft_total,
                    state="AWAITING_FINAL_CONFIRMATION",
                    customer_name=draft_name,
                    order_type="DELIVERY",
                    delivery_address=addr_text,
                )
                return _format_confirmation_ticket(
                    branch_name=branch_name,
                    customer_name=draft_name,
                    customer_phone=customer_phone,
                    items_summary=draft_items,
                    total_amt=draft_total,
                    order_type="DELIVERY",
                    delivery_address=addr_text,
                    target_branch_id=target_branch_id,
                )

        # STATE 4: AWAITING_FINAL_CONFIRMATION
        elif active_draft.state == "AWAITING_FINAL_CONFIRMATION":
            is_yes = clean_lower in [
                "1", "1.", "1️⃣", "yes", "yes please", "confirm", "haan", "ha", "ji haan",
                "place order", "btn_confirm_order_yes", "ok", "kardo", "done", "y"
            ]
            is_no = clean_lower in [
                "2", "2.", "2️⃣", "no", "no please", "cancel", "nahi", "rehne do", "mat karo",
                "btn_confirm_order_no", "n"
            ]

            if is_yes:
                order_items_create = [
                    OrderItemCreate(
                        branch_menu_item_id=it.get("branch_menu_item_id", 1),
                        quantity=it["quantity"],
                        notes=it.get("notes"),
                    )
                    for it in draft_items
                ]
                try:
                    placed_order = await orders_service.place_order(
                        branch_id=target_branch_id,
                        user_id=None,
                        items=order_items_create,
                        customer_phone=customer_phone,
                        customer_name=draft_name,
                        order_type=active_draft.orderType or "DINE_IN",
                        table_number=active_draft.tableNumber,
                        delivery_address=active_draft.deliveryAddress,
                    )
                    await delete_draft(customer_phone)

                    return _format_confirmed_receipt(
                        order_id=placed_order.id,
                        branch_name=branch_name,
                        customer_name=draft_name,
                        items_summary=draft_items,
                        total_amt=float(placed_order.totalAmount),
                        order_type=active_draft.orderType or "DINE_IN",
                        table_number=active_draft.tableNumber,
                        delivery_address=active_draft.deliveryAddress,
                        target_branch_id=target_branch_id,
                    )
                except Exception as e:
                    logger.error(f"Error placing order from confirmed draft: {e}")
                    reply = (
                        f"⚠️ We encountered an issue finalizing your order: {str(e)}\n\n"
                        f"Your draft has been preserved. Reply *1* to retry or *'cancel'* to cancel."
                    )
                    return WhatsAppOrderResponse(
                        status="ERROR",
                        branch_id=target_branch_id,
                        total_amount=draft_total,
                        items_placed=draft_items,
                        reply_message=reply,
                        buttons=[
                            {"id": "btn_confirm_order_yes", "text": "🔄 Retry"},
                            {"id": "btn_cancel_order", "text": "❌ Cancel"},
                        ],
                    )

            elif is_no:
                await delete_draft(customer_phone)
                reply = (
                    "❌ *Order Cancelled*\n\n"
                    "Your draft order was cancelled. No charges were made.\n\n"
                    "Reply *'menu'* anytime to explore our items!"
                )
                return WhatsAppOrderResponse(
                    status="DRAFT_CANCELLED",
                    branch_id=target_branch_id,
                    reply_message=reply,
                    buttons=[{"id": "btn_view_menu", "text": "📜 View Menu"}],
                )

    # 0. Handle Customer Rating & Experience Feedback (e.g. "5", "⭐⭐⭐⭐⭐", "4", "Loved it!", "Great coffee", "5 ⭐ Loved the coffee!")
    rating_match = re.search(r"\b([1-5])\s*(/5|\.0|⭐|star|stars)?\b", clean_msg, re.IGNORECASE) if len(clean_msg) < 50 else None
    is_star_emoji = any(c in clean_msg for c in ["⭐", "🌟", "✨"])
    is_positive_praise = any(p in clean_lower for p in [
        "loved it", "great coffee", "excellent", "awesome",
        "amazing", "good service", "nice coffee", "best coffee", "loved the coffee"
    ]) or clean_lower in ["good", "nice", "very good", "shukriya", "thanks", "thank you"]

    if (rating_match or is_star_emoji or is_positive_praise) and parsed.intent not in ["MENU_INQUIRY", "QUEUE_STATUS", "ORDER_STATUS", "CANCEL_ORDER"] and not parsed.items:
        stars_num = rating_match.group(1) if (rating_match and rating_match.group(1)) else ("5" if (is_positive_praise or is_star_emoji) else "")
        stars_display = f" ({stars_num}⭐)" if stars_num else ""
        reply = (
            f"🌟 *Thank you for your feedback, {customer_name}!*{stars_display}\n\n"
            f"We are thrilled you enjoyed your experience at *{branch_name}*. Your feedback means the world to our baristas!\n\n"
            f"Whenever you'd like your next coffee or pastry, simply reply with your order or type *'menu'*. Have a wonderful day! ☕"
        )
        return WhatsAppOrderResponse(
            status="FEEDBACK_RECEIVED",
            branch_id=target_branch_id,
            reply_message=reply,
            buttons=[{"id": "btn_view_menu", "text": "📜 View Menu"}],
        )

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
                "branch_menu_item_id": match.id,
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

    total_amt = sum(it["subtotal"] for it in items_summary)
    active_phone = customer_phone or "+920000000000"

    # 1. Shortcut: Dine-in with Table specified upfront (e.g. "2 lattes dine in table 4")
    if parsed.order_type == "DINE_IN" and parsed.table_number:
        await save_or_update_draft(
            customer_phone=active_phone,
            branch_id=target_branch_id,
            items_summary=items_summary,
            total_amount=total_amt,
            state="AWAITING_FINAL_CONFIRMATION",
            customer_name=customer_name,
            order_type="DINE_IN",
            table_number=parsed.table_number,
        )
        return _format_confirmation_ticket(
            branch_name=branch_name,
            customer_name=customer_name,
            customer_phone=active_phone,
            items_summary=items_summary,
            total_amt=total_amt,
            order_type="DINE_IN",
            table_number=parsed.table_number,
            target_branch_id=target_branch_id,
        )

    # 2. Shortcut: Delivery with Address specified upfront (e.g. "1 cold brew delivery to House 12, St 3")
    if parsed.order_type == "DELIVERY" and parsed.delivery_address:
        await save_or_update_draft(
            customer_phone=active_phone,
            branch_id=target_branch_id,
            items_summary=items_summary,
            total_amount=total_amt,
            state="AWAITING_FINAL_CONFIRMATION",
            customer_name=customer_name,
            order_type="DELIVERY",
            delivery_address=parsed.delivery_address,
        )
        return _format_confirmation_ticket(
            branch_name=branch_name,
            customer_name=customer_name,
            customer_phone=active_phone,
            items_summary=items_summary,
            total_amt=total_amt,
            order_type="DELIVERY",
            delivery_address=parsed.delivery_address,
            target_branch_id=target_branch_id,
        )

    # 3. Shortcut: Dine-in specified without Table # (e.g. "2 lattes dine in")
    if parsed.order_type == "DINE_IN":
        await save_or_update_draft(
            customer_phone=active_phone,
            branch_id=target_branch_id,
            items_summary=items_summary,
            total_amount=total_amt,
            state="AWAITING_TABLE_NUMBER",
            customer_name=customer_name,
            order_type="DINE_IN",
        )
        return _format_table_number_prompt(
            branch_name=branch_name,
            customer_name=customer_name,
            items_summary=items_summary,
            total_amt=total_amt,
            target_branch_id=target_branch_id,
        )

    # 4. Shortcut: Delivery specified without Address (e.g. "2 lattes delivery")
    if parsed.order_type == "DELIVERY":
        await save_or_update_draft(
            customer_phone=active_phone,
            branch_id=target_branch_id,
            items_summary=items_summary,
            total_amount=total_amt,
            state="AWAITING_DELIVERY_ADDRESS",
            customer_name=customer_name,
            order_type="DELIVERY",
        )
        return _format_delivery_address_prompt(
            branch_name=branch_name,
            customer_name=customer_name,
            items_summary=items_summary,
            total_amt=total_amt,
            target_branch_id=target_branch_id,
        )

    # 5. Standard Flow: Ask Dine-in or Delivery
    await save_or_update_draft(
        customer_phone=active_phone,
        branch_id=target_branch_id,
        items_summary=items_summary,
        total_amount=total_amt,
        state="AWAITING_ORDER_TYPE",
        customer_name=customer_name,
    )
    return _format_service_choice_prompt(
        branch_name=branch_name,
        customer_name=customer_name,
        items_summary=items_summary,
        total_amt=total_amt,
        target_branch_id=target_branch_id,
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
