"""
whatsapp_parser.py
Natural Language Ordering & Multi-Intent Extraction using Groq GPT-OSS-120B.
Extracts structured JSON: intent, items, quantities, special notes, and order references.
Supports English, Urdu, and Roman Urdu.
"""

import json
import re
import logging
from typing import Dict, Any, Optional

from app.modules.chatbot.core.llm import _chat_completions_create_with_fallback, GROQ_MODEL
from app.modules.webhooks.schemas import ParsedWhatsAppOrder, ParsedOrderItem

logger = logging.getLogger("webhooks.whatsapp.parser")

SYSTEM_PARSER_PROMPT = """You are an expert AI Barista conversational intent parser for a modern specialty café called Haji Cafe.
Your job is to read customer WhatsApp messages and classify them into a strict, validated JSON object.

INTENTS:
1. "ORDER": Customer explicitly wants to order/buy food or drinks (e.g. "2 Spanish Lattes and 1 Croissant", "send 1 iced americano", "ek latte bhej do").
2. "CANCEL_ORDER": Customer wants to cancel their active order (e.g. "cancel my order", "cancel order #24", "please cancel", "order cancel kardo", "nahi chahiye ab").
3. "QUEUE_STATUS": Customer asks about the kitchen queue or wait times (e.g. "how many orders are in queue?", "is it busy right now?", "what is the current wait time?", "kitna rush hai?", "queue kitni hai?").
4. "MY_ORDER_STATUS": Customer asks about their own specific order progress (e.g. "where is my order?", "status of order 24", "is my coffee ready?", "mera order kahan tak pohancha?").
5. "MENU_INQUIRY": Customer asks what items are available or asks for prices (e.g. "what are the items in your menu?", "show menu", "menu kya hai?", "coffee prices").
6. "RECOMMENDATION": Customer asks what they should order or what is popular (e.g. "what do you recommend?", "what is your best coffee?", "something cold and sweet").
7. "STORE_INFO": Customer asks about café timings, location, Wi-Fi, or amenities (e.g. "what time do you close?", "where are you located?", "wifi password kya hai?").
8. "HELP": General greetings, thanks, or polite chat (e.g. "hi", "hello", "assalam o alaikum", "thank you", "help").

RESPONSE FORMAT (STRICT JSON ONLY, NO MARKDOWN, NO COMMENTARY):
{
  "intent": "ORDER",
  "customer_name": "Sam",
  "branch_id": 1,
  "items": [
    {"name": "Spanish Latte", "quantity": 2, "notes": "extra hot"},
    {"name": "Butter Croissant", "quantity": 1, "notes": null}
  ],
  "order_id_reference": null,
  "inquiry_topic": null
}

RULES:
1. When intent is "CANCEL_ORDER" or "MY_ORDER_STATUS", extract any mentioned integer order ID into "order_id_reference" (e.g. "cancel order 24" -> 24).
2. Clean, standardize item names (e.g. 'Spanish Latte', 'Americano', 'Butter Croissant', 'Grilled Chicken Pesto Panini').
3. Default quantity is 1 unless specified.
4. Support Roman Urdu phrases natively (e.g. 'do latte bhej do', 'order cancel kardo', 'kitna rush hai').
5. Never classify "How many orders are in queue" as ORDER or MY_ORDER_STATUS — it must be QUEUE_STATUS.
6. Never classify "Cancel my order" as ORDER — it must be CANCEL_ORDER.
7. If the customer introduces themselves (e.g. "I am Sam", "My name is Bilal", "Mera naam Ali hai"), extract their name into "customer_name", otherwise null.
8. Return strictly valid JSON.
"""


async def parse_customer_message(message_text: str, default_branch_id: int = 1) -> ParsedWhatsAppOrder:
    """Parse raw text message using Groq GPT-OSS-120B into a structured ParsedWhatsAppOrder."""
    if not message_text or not message_text.strip():
        return ParsedWhatsAppOrder(intent="HELP", branch_id=default_branch_id, items=[])

    clean_lower = message_text.strip().lower()

    # Fast-path for Interactive Button IDs and Confirmation replies (0ms latency)
    yes_matches = {
        "1", "1.", "1️⃣", "option 1", "opt 1", "choice 1",
        "yes", "yes please", "yes cancel", "cancel yes", "yes, cancel", "y",
        "haan", "ha", "ji haan", "haan cancel kardo",
        "confirm", "confirm cancel", "confirm_cancel_yes"
    }
    no_matches = {
        "2", "2.", "2️⃣", "option 2", "opt 2", "choice 2",
        "no", "no please", "no, keep order", "no keep", "keep", "keep order", "n",
        "nahi", "ji nahi", "rehne do", "keep it", "mat karo",
        "confirm_cancel_no"
    }

    if clean_lower in yes_matches:
        return ParsedWhatsAppOrder(intent="CONFIRM_CANCEL_YES", branch_id=default_branch_id)

    if clean_lower in no_matches:
        return ParsedWhatsAppOrder(intent="CONFIRM_CANCEL_NO", branch_id=default_branch_id)

    if clean_lower in ["btn_track_status", "track status", "track order"]:
        return ParsedWhatsAppOrder(intent="MY_ORDER_STATUS", branch_id=default_branch_id)

    if clean_lower in ["btn_cancel_order", "cancel order"]:
        return ParsedWhatsAppOrder(intent="CANCEL_ORDER", branch_id=default_branch_id)

    if clean_lower in ["btn_view_menu", "view menu", "see menu"]:
        return ParsedWhatsAppOrder(intent="MENU_INQUIRY", branch_id=default_branch_id)

    if clean_lower in ["btn_queue_status", "check queue", "queue"]:
        return ParsedWhatsAppOrder(intent="QUEUE_STATUS", branch_id=default_branch_id)

    if clean_lower in ["btn_recommendations", "house favorites", "recommendations"]:
        return ParsedWhatsAppOrder(intent="RECOMMENDATION", branch_id=default_branch_id)

    user_prompt = f"Customer message: \"{message_text}\"\nDefault branch ID: {default_branch_id}"

    try:
        response = await _chat_completions_create_with_fallback(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PARSER_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.0,
            response_format={"type": "json_object"},
        )
        raw_json = response.choices[0].message.content or "{}"
        data = json.loads(raw_json)

        items_list = []
        for it in data.get("items", []):
            if isinstance(it, dict) and it.get("name"):
                items_list.append(
                    ParsedOrderItem(
                        name=str(it["name"]).strip(),
                        quantity=max(1, int(it.get("quantity", 1))),
                        notes=it.get("notes"),
                    )
                )

        intent = data.get("intent", "HELP").upper()
        # Sanity check: If intent is ORDER but items are empty, check for cancellation or queue keywords
        lower_msg = message_text.lower()
        if intent == "ORDER" and not items_list:
            if any(w in lower_msg for w in ["cancel", "cancle", "nahi chahiye", "khatam"]):
                intent = "CANCEL_ORDER"
            elif any(w in lower_msg for w in ["queue", "rush", "wait time", "how many"]):
                intent = "QUEUE_STATUS"
            else:
                intent = "HELP"

        ref_id = data.get("order_id_reference")
        if not ref_id:
            num_match = re.search(r"#?(\d+)", message_text)
            if num_match and intent in ["CANCEL_ORDER", "MY_ORDER_STATUS"]:
                ref_id = int(num_match.group(1))

        return ParsedWhatsAppOrder(
            intent=intent,
            customer_name=data.get("customer_name"),
            branch_id=int(data.get("branch_id", default_branch_id)),
            items=items_list,
            order_id_reference=int(ref_id) if ref_id else None,
            inquiry_topic=data.get("inquiry_topic"),
        )

    except Exception as e:
        logger.warning(f"Groq NLP parser fallback to heuristic: {e}")
        return _heuristic_fallback_parser(message_text, default_branch_id)


def _heuristic_fallback_parser(text: str, default_branch_id: int = 1) -> ParsedWhatsAppOrder:
    """Deterministic heuristic parser when LLM is unavailable."""
    lower = text.strip().lower()

    yes_matches = {
        "1", "1.", "1️⃣", "option 1", "opt 1", "choice 1",
        "yes", "yes please", "yes cancel", "cancel yes", "yes, cancel", "y",
        "haan", "ha", "ji haan", "haan cancel kardo",
        "confirm", "confirm cancel", "confirm_cancel_yes"
    }
    no_matches = {
        "2", "2.", "2️⃣", "option 2", "opt 2", "choice 2",
        "no", "no please", "no, keep order", "no keep", "keep", "keep order", "n",
        "nahi", "ji nahi", "rehne do", "keep it", "mat karo",
        "confirm_cancel_no"
    }

    if lower in yes_matches:
        return ParsedWhatsAppOrder(intent="CONFIRM_CANCEL_YES", branch_id=default_branch_id)

    if lower in no_matches:
        return ParsedWhatsAppOrder(intent="CONFIRM_CANCEL_NO", branch_id=default_branch_id)

    if lower in ["btn_track_status", "track status", "track order"]:
        return ParsedWhatsAppOrder(intent="MY_ORDER_STATUS", branch_id=default_branch_id)

    if lower in ["btn_cancel_order", "cancel order"]:
        return ParsedWhatsAppOrder(intent="CANCEL_ORDER", branch_id=default_branch_id)

    if lower in ["btn_view_menu", "view menu", "see menu"]:
        return ParsedWhatsAppOrder(intent="MENU_INQUIRY", branch_id=default_branch_id)

    if lower in ["btn_queue_status", "check queue", "queue"]:
        return ParsedWhatsAppOrder(intent="QUEUE_STATUS", branch_id=default_branch_id)

    if lower in ["btn_recommendations", "house favorites", "recommendations"]:
        return ParsedWhatsAppOrder(intent="RECOMMENDATION", branch_id=default_branch_id)

    # 1. Cancel Order
    if any(q in lower for q in ["cancel", "cancle", "nahi chahiye", "khatam kar"]):
        num_match = re.search(r"#?(\d+)", text)
        ref_id = int(num_match.group(1)) if num_match else None
        return ParsedWhatsAppOrder(intent="CANCEL_ORDER", branch_id=default_branch_id, order_id_reference=ref_id)

    # 2. Queue Status
    if any(q in lower for q in ["in queue", "queue", "rush", "wait time", "busy", "kitna time", "kitni der"]):
        return ParsedWhatsAppOrder(intent="QUEUE_STATUS", branch_id=default_branch_id)

    # 3. Personal Order Status
    if any(q in lower for q in ["where is my", "order status", "status of", "kahan hai mera", "order #"]):
        num_match = re.search(r"#?(\d+)", text)
        ref_id = int(num_match.group(1)) if num_match else None
        return ParsedWhatsAppOrder(intent="MY_ORDER_STATUS", branch_id=default_branch_id, order_id_reference=ref_id)

    # 4. Menu Inquiry
    if any(q in lower for q in ["menu", "price", "kya hai", "what do you have", "list", "items"]):
        return ParsedWhatsAppOrder(intent="MENU_INQUIRY", branch_id=default_branch_id)

    # 5. Recommendation
    if any(q in lower for q in ["recommend", "best", "special", "popular", "kya acha hai"]):
        return ParsedWhatsAppOrder(intent="RECOMMENDATION", branch_id=default_branch_id)

    # 6. Store Info
    if any(q in lower for q in ["timing", "hours", "location", "address", "wifi", "open"]):
        return ParsedWhatsAppOrder(intent="STORE_INFO", branch_id=default_branch_id)

    # 7. Item Matching for Order
    known_items = [
        ("spanish latte", "Spanish Latte"),
        ("americano", "Americano"),
        ("latte", "Latte"),
        ("cappuccino", "Cappuccino"),
        ("croissant", "Butter Croissant"),
        ("panini", "Grilled Chicken Pesto Panini"),
        ("cold brew", "Nitro Cold Brew"),
        ("muffin", "Blueberry Crumble Muffin"),
    ]

    items = []
    for key, formal_name in known_items:
        if key in lower:
            qty_match = re.search(rf"(\d+)\s*(?:x\s*)?{key}", lower)
            qty = int(qty_match.group(1)) if qty_match else 1
            items.append(ParsedOrderItem(name=formal_name, quantity=qty))

    name_match = re.search(r"(?:my name is|i am|i'm|mera naam|this is)\s+([A-Za-z]+)", text, re.IGNORECASE)
    detected_name = name_match.group(1).capitalize() if name_match else None

    intent = "ORDER" if items else "HELP"
    return ParsedWhatsAppOrder(intent=intent, branch_id=default_branch_id, items=items, customer_name=detected_name)
