"""
test_status_notifications.py
Test suite verifying automatic customer WhatsApp status notifications
(IN_PREPARATION, COMPLETED, CANCELLED) and customer feedback rating loop.
"""

import asyncio
import unittest
from unittest.mock import AsyncMock, MagicMock, patch
from types import SimpleNamespace

from app.modules.webhooks.whatsapp_service import (
    notify_customer_order_status_update,
    process_whatsapp_order,
)


class TestStatusNotifications(unittest.IsolatedAsyncioTestCase):

    def setUp(self):
        # Create a mock order with items and branch
        self.mock_item = SimpleNamespace(
            quantity=2,
            notes="Extra hot",
            branchMenuItem=SimpleNamespace(
                masterItem=SimpleNamespace(name="Spanish Latte")
            ),
        )
        self.mock_branch = SimpleNamespace(name="Downtown HQ")

        self.dine_in_order = SimpleNamespace(
            id=42,
            customerPhone="+923001234567",
            customerName="Ali Raza",
            orderType="DINE_IN",
            tableNumber="Table 4",
            deliveryAddress=None,
            branch=self.mock_branch,
            orderItems=[self.mock_item],
        )

        self.delivery_order = SimpleNamespace(
            id=43,
            customerPhone="+923009876543",
            customerName="Sara Khan",
            orderType="DELIVERY",
            tableNumber=None,
            deliveryAddress="House #12, Street 3, Islamabad",
            branch=self.mock_branch,
            orderItems=[self.mock_item],
        )

    @patch("app.modules.webhooks.whatsapp_service.send_waha_whatsapp_message", new_callable=AsyncMock)
    @patch("app.modules.webhooks.whatsapp_service.send_meta_whatsapp_message", new_callable=AsyncMock)
    async def test_dine_in_in_preparation(self, mock_meta, mock_waha):
        mock_waha.return_value = True
        mock_meta.return_value = False

        result = await notify_customer_order_status_update(self.dine_in_order, "IN_PREPARATION")
        self.assertTrue(result)

        mock_waha.assert_called_once()
        call_args = mock_waha.call_args[1]
        self.assertEqual(call_args["chat_id"], "+923001234567")
        msg = call_args["message_text"]

        self.assertIn("☕ *Order Update: In Preparation!*", msg)
        self.assertIn("Ali Raza", msg)
        self.assertIn("Table 4", msg)
        self.assertIn("2x Spanish Latte (Extra hot)", msg)
        self.assertIn("~5-8 minutes", msg)

    @patch("app.modules.webhooks.whatsapp_service.send_waha_whatsapp_message", new_callable=AsyncMock)
    @patch("app.modules.webhooks.whatsapp_service.send_meta_whatsapp_message", new_callable=AsyncMock)
    async def test_delivery_in_preparation(self, mock_meta, mock_waha):
        mock_waha.return_value = True

        result = await notify_customer_order_status_update(self.delivery_order, "IN_PREPARATION")
        self.assertTrue(result)

        call_args = mock_waha.call_args[1]
        msg = call_args["message_text"]
        self.assertIn("☕ *Order Update: In Preparation!*", msg)
        self.assertIn("House #12, Street 3, Islamabad", msg)
        self.assertIn("~10-15 minutes", msg)

    @patch("app.modules.webhooks.whatsapp_service.send_waha_whatsapp_message", new_callable=AsyncMock)
    @patch("app.modules.webhooks.whatsapp_service.send_meta_whatsapp_message", new_callable=AsyncMock)
    async def test_dine_in_completed_with_rating_prompt(self, mock_meta, mock_waha):
        mock_waha.return_value = True

        result = await notify_customer_order_status_update(self.dine_in_order, "COMPLETED")
        self.assertTrue(result)

        call_args = mock_waha.call_args[1]
        msg = call_args["message_text"]
        self.assertIn("🎉 *Order Ready!*", msg)
        self.assertIn("Table 4", msg)
        self.assertIn("Reply with a rating from *1 to 5*", msg)

    @patch("app.modules.webhooks.whatsapp_service.send_waha_whatsapp_message", new_callable=AsyncMock)
    @patch("app.modules.webhooks.whatsapp_service.send_meta_whatsapp_message", new_callable=AsyncMock)
    async def test_delivery_completed_with_rating_prompt(self, mock_meta, mock_waha):
        mock_waha.return_value = True

        result = await notify_customer_order_status_update(self.delivery_order, "COMPLETED")
        self.assertTrue(result)

        call_args = mock_waha.call_args[1]
        msg = call_args["message_text"]
        self.assertIn("🛵 *Order Out for Delivery!*", msg)
        self.assertIn("House #12, Street 3, Islamabad", msg)
        self.assertIn("Reply with a rating from *1 to 5*", msg)

    @patch("app.modules.webhooks.whatsapp_service.send_waha_whatsapp_message", new_callable=AsyncMock)
    @patch("app.modules.webhooks.whatsapp_service.send_meta_whatsapp_message", new_callable=AsyncMock)
    async def test_order_cancelled_notification(self, mock_meta, mock_waha):
        mock_waha.return_value = True

        result = await notify_customer_order_status_update(self.dine_in_order, "CANCELLED")
        self.assertTrue(result)

        call_args = mock_waha.call_args[1]
        msg = call_args["message_text"]
        self.assertIn("❌ *Order Update: Cancelled*", msg)
        self.assertIn("Downtown HQ", msg)

    async def test_order_without_phone_skipped(self):
        order_no_phone = SimpleNamespace(
            id=99,
            customerPhone=None,
            customerName="Walk-in Guest",
        )
        result = await notify_customer_order_status_update(order_no_phone, "IN_PREPARATION")
        self.assertFalse(result)

    @patch("app.modules.webhooks.whatsapp_service.db")
    @patch("app.modules.webhooks.whatsapp_service.get_active_draft", new_callable=AsyncMock)
    async def test_rating_feedback_loop(self, mock_draft, mock_db):
        mock_draft.return_value = None
        mock_db.branch.find_unique = AsyncMock(return_value=SimpleNamespace(name="Downtown HQ", cafe=None))

        # Customer sends a 5-star rating
        resp1 = await process_whatsapp_order(
            message_text="5",
            customer_name="Ali Raza",
            customer_phone="+923001234567",
            branch_id=1,
        )
        self.assertEqual(resp1.status, "FEEDBACK_RECEIVED")
        self.assertIn("*Thank you for your feedback, Ali Raza!* (5⭐)", resp1.reply_message)

        # Customer sends star emojis
        resp2 = await process_whatsapp_order(
            message_text="⭐⭐⭐⭐⭐",
            customer_name="Sara Khan",
            customer_phone="+923009876543",
            branch_id=1,
        )
        self.assertEqual(resp2.status, "FEEDBACK_RECEIVED")
        self.assertIn("Thank you for your feedback, Sara Khan!", resp2.reply_message)

        # Customer sends praise phrase
        resp3 = await process_whatsapp_order(
            message_text="Loved it!",
            customer_name="Zubair",
            customer_phone="+923001112233",
            branch_id=1,
        )
        self.assertEqual(resp3.status, "FEEDBACK_RECEIVED")
        self.assertIn("Thank you for your feedback, Zubair!", resp3.reply_message)


if __name__ == "__main__":
    unittest.main()
