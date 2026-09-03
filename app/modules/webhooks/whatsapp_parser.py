"""
whatsapp_parser.py
Natural Language Ordering & Intent Extraction using Groq GPT-OSS-120B.
Extracts structured JSON: items, quantities, special notes, and intent.
Supports English, Urdu, and Roman Urdu.
"""

import json
import re
import logging
from typing import Dict, Any

from app.modules.chatbot.core.llm import _chat_completions_create_with_fallback, GROQ_MODEL
from app.modules.webhooks.schemas import ParsedWhatsAppOrder, ParsedOrderItem

logger = logging.getLogger("webhooks.whatsapp.parser")

SYSTEM_PARSER_PROMPT = (
    "You are an expert natural language order parser for a modern specialty café called Haji Cafe.\n"
    "Your job is to read raw customer WhatsApp or SMS messages and parse them into a strict, validated JSON object.\n\n"
    "INTENTS:\n"
    "- 'ORDER': The customer wants to buy or order food/beverages.\n"
    "- 'MENU_INQUIRY': The customer asks what is available, asks for recommendations, or asks about prices.\n"
    "- 'ORDER_STATUS': The customer asks where their order is, or provides an order number.\n"
    "- 'HELP': Greetings, hours inquiry, or general question.\n\n"
    "RESPONSE FORMAT (STRICT JSON ONLY, NO MARKDOWN, NO COMMENTARY):\n"
    "{\n"
    "  \"intent\": \"ORDER\",\n"
    "  \"branch_id\": 1,\n"
    "  \"items\": [\n"
    "    {\"name\": \"Spanish Latte\", \"quantity\": 2, \"notes\": \"extra hot\"},\n"
    "    {\"name\": \"Butter Croissant\", \"quantity\": 1, \"notes\": null}\n"
    "  ],\n"
    "  \"inquiry_topic\": null\n"
    "}\n\n"
    "RULES:\n"
    "1. Extract item names as clean, standardized coffee/bakery names (e.g. 'Spanish Latte', 'Americano', 'Butter Croissant', 'Grilled Chicken Pesto Panini').\n"
    "2. Default quantity is 1 unless specified.\n"
    "3. Support Roman Urdu phrases (e.g. 'do latte bhej do', 'ek croissant chahiye', 'order kahan hai').\n"
    "4. Return valid JSON only."
)


async def parse_customer_message(message_text: str, default_branch_id: int = 1) -> ParsedWhatsAppOrder:
    """Parse raw text message using Groq GPT-OSS-120B into a structured ParsedWhatsAppOrder."""
    if not message_text or not message_text.strip():
        return ParsedWhatsAppOrder(intent="HELP", branch_id=default_branch_id, items=[])

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

        return ParsedWhatsAppOrder(
            intent=data.get("intent", "ORDER").upper(),
            customer_name=data.get("customer_name"),
            branch_id=int(data.get("branch_id", default_branch_id)),
            items=items_list,
            inquiry_topic=data.get("inquiry_topic"),
        )

    except Exception as e:
        logger.warning(f"Groq NLP parser fallback to heuristic: {e}")
        return _heuristic_fallback_parser(message_text, default_branch_id)


def _heuristic_fallback_parser(text: str, default_branch_id: int = 1) -> ParsedWhatsAppOrder:
    """Fast regex-based heuristic parser for fallback when LLM is unreachable."""
    lower = text.lower()

    if any(q in lower for q in ["status", "where is", "order #", "kahan"]):
        return ParsedWhatsAppOrder(intent="ORDER_STATUS", branch_id=default_branch_id)

    if any(q in lower for q in ["menu", "price", "kya hai", "what do you have"]):
        return ParsedWhatsAppOrder(intent="MENU_INQUIRY", branch_id=default_branch_id)

    # Heuristic item matching
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
            # Check for quantity digit preceding item
            qty_match = re.search(rf"(\d+)\s*(?:x\s*)?{key}", lower)
            qty = int(qty_match.group(1)) if qty_match else 1
            items.append(ParsedOrderItem(name=formal_name, quantity=qty))

    intent = "ORDER" if items else "HELP"
    return ParsedWhatsAppOrder(intent=intent, branch_id=default_branch_id, items=items)
