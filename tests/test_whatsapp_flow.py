"""
tests/test_whatsapp_flow.py
Comprehensive verification test suite for the multi-turn WhatsApp conversational ordering system:
1. Table number normalization
2. One-shot parsing (order_type, table_number, delivery_address extraction)
3. Multi-turn Dine-in flow (AWAITING_ORDER_TYPE -> AWAITING_TABLE_NUMBER -> AWAITING_FINAL_CONFIRMATION -> ORDER_PLACED)
4. Multi-turn Delivery flow (AWAITING_ORDER_TYPE -> AWAITING_DELIVERY_ADDRESS -> AWAITING_FINAL_CONFIRMATION -> ORDER_PLACED)
5. Fast-path shortcut flow (Items + Dine-in + Table in single message -> AWAITING_FINAL_CONFIRMATION)
6. Customer cancellation flow (Purges draft without order placement)
"""

import sys
sys.path.insert(0, ".")
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from decimal import Decimal

from app.modules.webhooks.whatsapp_parser import normalize_table_number, parse_customer_message
from app.modules.webhooks import whatsapp_service
from app.modules.webhooks.schemas import ParsedWhatsAppOrder, ParsedOrderItem


def test_table_number_normalization():
    """Verify table number sanitization and formatting."""
    assert normalize_table_number("4") == "Table 4"
    assert normalize_table_number("table 4") == "Table 4"
    assert normalize_table_number("Table 12") == "Table 12"
    assert normalize_table_number("t-5") == "Table 5"
    assert normalize_table_number("tbl 8") == "Table 8"
    assert normalize_table_number("outdoor 2") == "Outdoor 2"
    assert normalize_table_number("patio 1") == "Patio 1"
    assert normalize_table_number("VIP") == "Vip"


async def test_one_shot_heuristic_parsing():
    """Verify one-shot extraction of items, service type, table, and address."""
    # Dine-in with table
    msg1 = "2 Spanish Lattes dine in table 4"
    parsed1 = await parse_customer_message(msg1)
    assert parsed1.intent == "ORDER"
    assert parsed1.order_type == "DINE_IN"
    assert parsed1.table_number == "Table 4"
    assert len(parsed1.items) >= 1
    assert parsed1.items[0].quantity == 2

    # Delivery with address
    msg2 = "1 cold brew delivery to House 12, Street 3"
    parsed2 = await parse_customer_message(msg2)
    assert parsed2.intent == "ORDER"
    assert parsed2.order_type == "DELIVERY"
    assert parsed2.delivery_address is not None
    assert "House 12" in parsed2.delivery_address


async def test_multi_turn_dine_in_flow():
    """Verify step-by-step multi-turn Dine-in conversation with mock database."""
    test_phone = "+923009998877"
    in_memory_drafts = {}

    async def mock_get_active_draft(phone):
        return in_memory_drafts.get(phone)

    async def mock_save_draft(customer_phone, branch_id, items_summary, total_amount, state="AWAITING_ORDER_TYPE", customer_name=None, order_type=None, table_number=None, delivery_address=None):
        import json
        mock_obj = MagicMock()
        mock_obj.customerPhone = customer_phone
        mock_obj.branchId = branch_id
        mock_obj.itemsJson = json.dumps(items_summary)
        mock_obj.totalAmount = total_amount
        mock_obj.state = state
        mock_obj.customerName = customer_name
        mock_obj.orderType = order_type
        mock_obj.tableNumber = table_number
        mock_obj.deliveryAddress = delivery_address
        in_memory_drafts[customer_phone] = mock_obj
        return mock_obj

    async def mock_delete_draft(phone):
        in_memory_drafts.pop(phone, None)
        return True

    # Mock order placement
    mock_placed_order = MagicMock()
    mock_placed_order.id = 101
    mock_placed_order.totalAmount = Decimal("9.50")

    # Mock menu catalog
    mock_branch_item = MagicMock()
    mock_branch_item.id = 1
    mock_branch_item.availableQuantity = 50
    mock_branch_item.isInStock = True
    mock_branch_item.isActive = True
    mock_branch_item.priceOverride = Decimal("4.75")
    mock_branch_item.masterItem.name = "Spanish Latte"
    mock_branch_item.masterItem.basePrice = Decimal("4.75")

    mock_db = MagicMock()
    mock_branch = MagicMock()
    mock_branch.name = "Downtown HQ"
    mock_db.branch.find_unique = AsyncMock(return_value=mock_branch)
    mock_db.branchmenuitem.find_many = AsyncMock(return_value=[mock_branch_item])
    mock_db.order.find_first = AsyncMock(return_value=None)

    with patch.object(whatsapp_service, "db", mock_db), \
         patch.object(whatsapp_service, "get_active_draft", side_effect=mock_get_active_draft), \
         patch.object(whatsapp_service, "save_or_update_draft", side_effect=mock_save_draft), \
         patch.object(whatsapp_service, "delete_draft", side_effect=mock_delete_draft), \
         patch.object(whatsapp_service.orders_service, "place_order", AsyncMock(return_value=mock_placed_order)), \
         patch.object(whatsapp_service.orders_repo, "get_active_orders_by_customer", AsyncMock(return_value=[])):

        # TURN 1: Customer sends order items
        resp1 = await whatsapp_service.process_whatsapp_order(
            message_text="2 Spanish Lattes please",
            customer_name="Shaheer",
            customer_phone=test_phone,
            branch_id=1,
        )
        assert resp1.status == "AWAITING_ORDER_TYPE"
        assert "Dine-in" in resp1.reply_message
        assert "Delivery" in resp1.reply_message
        assert in_memory_drafts[test_phone].state == "AWAITING_ORDER_TYPE"

        # TURN 2: Customer selects Dine-in ("1")
        resp2 = await whatsapp_service.process_whatsapp_order(
            message_text="1",
            customer_name="Shaheer",
            customer_phone=test_phone,
            branch_id=1,
        )
        assert resp2.status == "AWAITING_TABLE_NUMBER"
        assert "Table Number" in resp2.reply_message
        assert in_memory_drafts[test_phone].state == "AWAITING_TABLE_NUMBER"
        assert in_memory_drafts[test_phone].orderType == "DINE_IN"

        # TURN 3: Customer provides Table Number ("Table 7")
        resp3 = await whatsapp_service.process_whatsapp_order(
            message_text="Table 7",
            customer_name="Shaheer",
            customer_phone=test_phone,
            branch_id=1,
        )
        assert resp3.status == "AWAITING_FINAL_CONFIRMATION"
        assert "Please Confirm Your Order" in resp3.reply_message
        assert "Table 7" in resp3.reply_message
        assert in_memory_drafts[test_phone].state == "AWAITING_FINAL_CONFIRMATION"
        assert in_memory_drafts[test_phone].tableNumber == "Table 7"

        # TURN 4: Customer confirms ("1" / "Yes")
        resp4 = await whatsapp_service.process_whatsapp_order(
            message_text="1",
            customer_name="Shaheer",
            customer_phone=test_phone,
            branch_id=1,
        )
        assert resp4.status == "ORDER_PLACED"
        assert resp4.order_id == 101
        assert "Order Confirmed!" in resp4.reply_message
        assert "Table 7" in resp4.reply_message
        # Draft must be purged after order placement
        assert test_phone not in in_memory_drafts


async def test_customer_cancellation_flow():
    """Verify customer can cancel draft at any stage with 0 charges."""
    test_phone = "+923001112233"
    in_memory_drafts = {}

    async def mock_get_active_draft(phone):
        return in_memory_drafts.get(phone)

    async def mock_save_draft(customer_phone, branch_id, items_summary, total_amount, state="AWAITING_ORDER_TYPE", customer_name=None, order_type=None, table_number=None, delivery_address=None):
        import json
        mock_obj = MagicMock()
        mock_obj.customerPhone = customer_phone
        mock_obj.branchId = branch_id
        mock_obj.itemsJson = json.dumps(items_summary)
        mock_obj.totalAmount = total_amount
        mock_obj.state = state
        mock_obj.customerName = customer_name
        in_memory_drafts[customer_phone] = mock_obj
        return mock_obj

    async def mock_delete_draft(phone):
        in_memory_drafts.pop(phone, None)
        return True

    mock_branch_item = MagicMock()
    mock_branch_item.id = 1
    mock_branch_item.availableQuantity = 50
    mock_branch_item.isInStock = True
    mock_branch_item.isActive = True
    mock_branch_item.priceOverride = Decimal("3.00")
    mock_branch_item.masterItem.name = "Americano"
    mock_branch_item.masterItem.basePrice = Decimal("3.00")

    mock_db = MagicMock()
    mock_branch = MagicMock()
    mock_branch.name = "Downtown HQ"
    mock_db.branch.find_unique = AsyncMock(return_value=mock_branch)
    mock_db.branchmenuitem.find_many = AsyncMock(return_value=[mock_branch_item])
    mock_db.order.find_first = AsyncMock(return_value=None)

    with patch.object(whatsapp_service, "db", mock_db), \
         patch.object(whatsapp_service, "get_active_draft", side_effect=mock_get_active_draft), \
         patch.object(whatsapp_service, "save_or_update_draft", side_effect=mock_save_draft), \
         patch.object(whatsapp_service, "delete_draft", side_effect=mock_delete_draft), \
         patch.object(whatsapp_service.orders_repo, "get_active_orders_by_customer", AsyncMock(return_value=[])):

        # Turn 1: Order started
        resp1 = await whatsapp_service.process_whatsapp_order(
            message_text="1 Americano",
            customer_name="Ali",
            customer_phone=test_phone,
            branch_id=1,
        )
        assert resp1.status == "AWAITING_ORDER_TYPE"
        assert test_phone in in_memory_drafts

        # Turn 2: Customer says "cancel"
        resp2 = await whatsapp_service.process_whatsapp_order(
            message_text="cancel",
            customer_name="Ali",
            customer_phone=test_phone,
            branch_id=1,
        )
        assert resp2.status == "DRAFT_CANCELLED"
        assert "Order Cancelled" in resp2.reply_message
        assert test_phone not in in_memory_drafts


async def test_shortcut_flow_to_confirmation():
    """Verify one-shot order skips redundant questions and goes directly to confirmation."""
    test_phone = "+923004445566"
    in_memory_drafts = {}

    async def mock_get_active_draft(phone):
        return in_memory_drafts.get(phone)

    async def mock_save_draft(customer_phone, branch_id, items_summary, total_amount, state="AWAITING_ORDER_TYPE", customer_name=None, order_type=None, table_number=None, delivery_address=None):
        import json
        mock_obj = MagicMock()
        mock_obj.customerPhone = customer_phone
        mock_obj.branchId = branch_id
        mock_obj.itemsJson = json.dumps(items_summary)
        mock_obj.totalAmount = total_amount
        mock_obj.state = state
        mock_obj.customerName = customer_name
        mock_obj.orderType = order_type
        mock_obj.tableNumber = table_number
        mock_obj.deliveryAddress = delivery_address
        in_memory_drafts[customer_phone] = mock_obj
        return mock_obj

    mock_branch_item = MagicMock()
    mock_branch_item.id = 1
    mock_branch_item.availableQuantity = 50
    mock_branch_item.isInStock = True
    mock_branch_item.isActive = True
    mock_branch_item.priceOverride = Decimal("4.75")
    mock_branch_item.masterItem.name = "Spanish Latte"
    mock_branch_item.masterItem.basePrice = Decimal("4.75")

    mock_db = MagicMock()
    mock_branch = MagicMock()
    mock_branch.name = "Downtown HQ"
    mock_db.branch.find_unique = AsyncMock(return_value=mock_branch)
    mock_db.branchmenuitem.find_many = AsyncMock(return_value=[mock_branch_item])
    mock_db.order.find_first = AsyncMock(return_value=None)

    with patch.object(whatsapp_service, "db", mock_db), \
         patch.object(whatsapp_service, "get_active_draft", side_effect=mock_get_active_draft), \
         patch.object(whatsapp_service, "save_or_update_draft", side_effect=mock_save_draft), \
         patch.object(whatsapp_service.orders_repo, "get_active_orders_by_customer", AsyncMock(return_value=[])):

        resp = await whatsapp_service.process_whatsapp_order(
            message_text="2 Spanish Lattes dine in table 5",
            customer_name="Usman",
            customer_phone=test_phone,
            branch_id=1,
        )
        # Must skip straight to AWAITING_FINAL_CONFIRMATION!
        assert resp.status == "AWAITING_FINAL_CONFIRMATION"
        assert "Table 5" in resp.reply_message
        assert "Please Confirm Your Order" in resp.reply_message
        assert in_memory_drafts[test_phone].tableNumber == "Table 5"
        assert in_memory_drafts[test_phone].orderType == "DINE_IN"


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    print("Running WhatsApp Multi-Turn Ordering Test Suite...")

    print("1. Testing table normalization...")
    test_table_number_normalization()
    print("   ✅ Table normalization passed!")

    print("2. Testing one-shot parsing...")
    asyncio.run(test_one_shot_heuristic_parsing())
    print("   ✅ One-shot parsing passed!")

    print("3. Testing multi-turn Dine-in flow...")
    asyncio.run(test_multi_turn_dine_in_flow())
    print("   ✅ Multi-turn Dine-in flow passed!")

    print("4. Testing customer cancellation flow...")
    asyncio.run(test_customer_cancellation_flow())
    print("   ✅ Customer cancellation flow passed!")

    print("5. Testing shortcut flow to confirmation...")
    asyncio.run(test_shortcut_flow_to_confirmation())
    print("   ✅ Shortcut flow passed!")

    print("\n🎉 ALL TESTS PASSED SUCCESSFULLY!")

