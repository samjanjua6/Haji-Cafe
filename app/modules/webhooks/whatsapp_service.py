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
) -> bool:
    """
    Send an outbound message directly to customer's WhatsApp using WAHA (WhatsApp HTTP API).
    Endpoint: POST {waha_url}/api/sendText
    """
    base_url = waha_url or os.getenv("WAHA_API_URL", "http://localhost:3000")
    clean_id = chat_id.replace("+", "").replace(" ", "").replace("-", "").strip()
    if not clean_id.endswith("@c.us") and not clean_id.endswith("@g.us"):
        clean_id = f"{clean_id}@c.us"

    url = f"{base_url.rstrip('/')}/api/sendText"
    payload = {
        "chatId": clean_id,
        "text": message_text,
        "session": "default",
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code in [200, 201]:
                logger.info(f"WAHA WhatsApp reply successfully sent to {clean_id}")
                return True
            else:
                logger.debug(f"WAHA send response: {resp.status_code} - {resp.text}")
                return False
    except Exception as e:
        logger.debug(f"WAHA outbound call skipped/unavailable: {e}")
        return False


async def process_whatsapp_order(
    message_text: str,
    customer_name: Optional[str] = "WhatsApp Customer",
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

    branch = await db.branch.find_unique(where={"id": target_branch_id}, include={"cafe": True})
    branch_name = branch.name if branch else f"Branch #{target_branch_id}"

    # Handle Inquiries
    if parsed.intent == "MENU_INQUIRY":
        branch_items = await db.branchmenuitem.find_many(
            where={"branchId": target_branch_id, "isActive": True, "isInStock": True},
            include={"masterItem": True},
            take=6,
        )
        menu_lines = []
        for bi in branch_items:
            price = bi.priceOverride if bi.priceOverride is not None else bi.masterItem.basePrice
            menu_lines.append(f"• {bi.masterItem.name}: ${price:.2f}")
        menu_str = "\n".join(menu_lines) or "• Spanish Latte: $4.75\n• Americano: $3.25\n• Butter Croissant: $3.50"

        reply = (
            f"☕ Welcome to Haji Cafe ({branch_name})!\n\n"
            f"Here are our most popular items available right now:\n{menu_str}\n\n"
            f"To place an order, just reply with what you'd like, e.g.:\n"
            f"\"Can I get 2 Spanish Lattes and 1 Croissant?\""
        )
        return WhatsAppOrderResponse(
            status="INFO",
            branch_id=target_branch_id,
            reply_message=reply,
        )

    # Handle Order Status
    if parsed.intent == "ORDER_STATUS":
        recent_order = await db.order.find_first(
            where={"branchId": target_branch_id},
            order={"createdAt": "desc"},
            include={"orderItems": {"include": {"branchMenuItem": {"include": {"masterItem": True}}}}},
        )
        if recent_order:
            status_desc = {
                "PENDING": "queued and sent to the kitchen",
                "IN_PREPARATION": "being freshly prepared by our barista",
                "COMPLETED": "ready for pickup at the counter!",
                "CANCELLED": "cancelled",
            }.get(recent_order.status, "in progress")
            reply = (
                f"🧾 Order #{recent_order.id} Status: {recent_order.status}\n"
                f"Your order is currently {status_desc}.\n"
                f"Total: ${recent_order.totalAmount:.2f}."
            )
        else:
            reply = "You don't have any recent active orders. Reply with what you'd like to order!"

        return WhatsAppOrderResponse(
            status="STATUS",
            branch_id=target_branch_id,
            reply_message=reply,
        )

    # Handle Order Creation
    if not parsed.items:
        reply = (
            f"👋 Hello {customer_name or 'there'}! Welcome to Haji Cafe.\n\n"
            f"What would you like to order today? You can type naturally, for example:\n"
            f"👉 \"Send 2 Spanish Lattes and 1 Butter Croissant for pickup.\""
        )
        return WhatsAppOrderResponse(
            status="HELP",
            branch_id=target_branch_id,
            reply_message=reply,
        )

    # Resolve items against branch inventory
    all_branch_items = await db.branchmenuitem.find_many(
        where={"branchId": target_branch_id, "isActive": True},
        include={"masterItem": True},
    )

    items_to_order: List[OrderItemCreate] = []
    items_summary = []

    for req_item in parsed.items:
        match = _find_best_menu_match(req_item.name, all_branch_items)
        if match:
            if not match.isInStock or (match.availableQuantity is not None and match.availableQuantity < req_item.quantity):
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

    if not items_to_order:
        reply = (
            f"Sorry, we couldn't find the requested items in stock at {branch_name}.\n"
            f"Our favorites: Spanish Latte ($4.75), Americano ($3.25), Butter Croissant ($3.50).\n"
            f"Reply with an item name to order!"
        )
        return WhatsAppOrderResponse(
            status="UNAVAILABLE",
            branch_id=target_branch_id,
            reply_message=reply,
        )

    # Create real order in PostgreSQL (which automatically broadcasts ORDER_CREATED to KDS!)
    placed_order = await orders_service.place_order(
        branch_id=target_branch_id,
        user_id=None,  # WhatsApp customer
        items=items_to_order,
    )

    order_id = placed_order.id
    total_amt = float(placed_order.totalAmount)

    # Format WhatsApp Receipt
    lines = []
    for it in items_summary:
        note_str = f" ({it['notes']})" if it.get("notes") else ""
        lines.append(f"• {it['quantity']}x {it['item_name']}{note_str} — ${it['subtotal']:.2f}")

    receipt_items_str = "\n".join(lines)
    reply_receipt = (
        f"🎉 Order Confirmed! Order #{order_id}\n"
        f"📍 Branch: {branch_name}\n\n"
        f"Order Summary:\n{receipt_items_str}\n\n"
        f"💵 Total: ${total_amt:.2f}\n"
        f"⏱️ Estimated Prep Time: ~10 minutes\n\n"
        f"Your order is now live on our kitchen display! We'll notify you when it's ready for pickup."
    )

    return WhatsAppOrderResponse(
        status="ORDER_PLACED",
        order_id=order_id,
        branch_id=target_branch_id,
        total_amount=total_amt,
        items_placed=items_summary,
        reply_message=reply_receipt,
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
