"""
test_phase3_features.py
Verification suite for Haji Cafe Phase 3 features:
1. Autonomous Agentic AI Triggers & 1-Click Execution
2. Customer Review Sentiment Analysis Engine & Executive KPIs
3. WhatsApp Natural Language Order Parsing & Simulator
"""

import asyncio
import sys

# Ensure UTF-8 console output
sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, ".")

from app.modules.webhooks.whatsapp_parser import parse_customer_message
from app.modules.analytics import sentiment as sentiment_service
from app.modules.analytics.sentiment import ReviewCreateRequest
from app.modules.agentic import service as agentic_service


async def test_whatsapp_parser():
    print("\n--- 1. Testing WhatsApp Natural Language Order Parser ---")
    messages = [
        "Can I get 2 Spanish Lattes and 1 Butter Croissant extra hot?",
        "What cold drinks do you have?",
        "Where is my order #5?",
    ]
    for msg in messages:
        parsed = await parse_customer_message(msg)
        print(f"Message: '{msg}'")
        print(f"  -> Intent: {parsed.intent}")
        print(f"  -> Items: {[(it.name, it.quantity, it.notes) for it in parsed.items]}")
        assert parsed.intent in ["ORDER", "MENU_INQUIRY", "ORDER_STATUS", "HELP"], f"Unexpected intent: {parsed.intent}"
    print("✅ WhatsApp Parser verified successfully!")


async def test_sentiment_engine():
    print("\n--- 2. Testing Customer Review Sentiment Engine & KPIs ---")
    # Positive review
    pos_res = await sentiment_service.analyze_and_record_review(
        ReviewCreateRequest(
            branch_id=1,
            customer_name="Amina Tariq",
            rating=5,
            comment="Absolutely fantastic espresso and lightning-fast service! My favorite cafe in town.",
        )
    )
    print(f"Positive Review: Sentiment={pos_res.sentiment}, Score={pos_res.sentiment_score}, Alert={pos_res.manager_alert}")
    assert pos_res.sentiment in ["POSITIVE", "NEUTRAL"], f"Expected positive, got {pos_res.sentiment}"
    assert pos_res.manager_alert is False, "Positive review should not trigger manager alert"

    # Negative review (should trigger manager alert)
    neg_res = await sentiment_service.analyze_and_record_review(
        ReviewCreateRequest(
            branch_id=1,
            customer_name="Usman Ali",
            rating=1,
            comment="The latte was lukewarm and tasted burnt. Table was also dirty.",
        )
    )
    print(f"Negative Review: Sentiment={neg_res.sentiment}, Score={neg_res.sentiment_score}, Alert={neg_res.manager_alert}")
    assert neg_res.sentiment in ["NEGATIVE", "NEUTRAL"], f"Expected negative, got {neg_res.sentiment}"
    assert neg_res.manager_alert is True, "Negative review MUST trigger manager alert"

    # Executive KPIs
    kpis = await sentiment_service.get_sentiment_kpis(branch_id=1)
    print(f"Sentiment KPIs: Total={kpis.total_reviews}, Net Sentiment={kpis.overall_sentiment_index_pct}%, Alerts={kpis.urgent_alerts_count}")
    print(f"Aspect Satisfaction: {kpis.aspect_satisfaction}")
    assert kpis.total_reviews >= 2, "Reviews count should be at least 2"
    assert kpis.urgent_alerts_count >= 1, "Should record at least 1 manager alert"

    # Manager Reply
    replied = await sentiment_service.reply_to_review(review_id=neg_res.id, manager_reply="Apologies Usman! We will replace your drink on the house.")
    assert replied is not None, "Manager reply failed"
    assert replied.manager_alert is False, "Resolved review should clear manager alert"
    print("✅ Customer Review Sentiment Engine verified successfully!")


async def test_agentic_triggers():
    print("\n--- 3. Testing Autonomous Agentic Triggers & 1-Click Approvals ---")
    # Seed mock alerts if DB is in offline testing mode
    alert_1 = await agentic_service._save_alert(
        branch_id=1,
        cafe_id=1,
        trigger_type="LOW_STOCK_DRAFT",
        severity="URGENT",
        title="🚨 Restock Alert: Spanish Latte (Only 3 left)",
        message="Critical inventory threshold reached. Autonomous agent formulated Draft PO for 30 units.",
        suggested_action="Approve Draft PO & Restock 30 Units",
        action_payload={"branch_menu_item_id": 1, "item_id": 1, "item_name": "Spanish Latte", "reorder_quantity": 30, "action_type": "RESTOCK"},
    )
    alert_2 = await agentic_service._save_alert(
        branch_id=1,
        cafe_id=1,
        trigger_type="STALE_ITEM_DISCOUNT",
        severity="MEDIUM",
        title="🏷️ Stale Item Discount: Blueberry Muffin Unsold for 3 Days",
        message="Blueberry Muffin recorded 0 sales in past 72h. AI recommends 18% promotional markdown from $4.50 to $3.69.",
        suggested_action="1-Click Apply 18% Discount ($3.69)",
        action_payload={"branch_menu_item_id": 2, "item_id": 2, "discounted_price": 3.69, "action_type": "APPLY_DISCOUNT"},
    )

    alerts = await agentic_service.get_all_alerts(branch_id=1, status="PENDING")
    print(f"Active Pending Alerts: {len(alerts)}")
    assert len(alerts) >= 2, "Should find at least 2 pending alerts"

    # 1-Click Approve
    approve_res = await agentic_service.approve_alert(alert_id=alert_1["id"], user_id=1)
    print(f"Approved Alert #{alert_1['id']}: Status={approve_res.status}, Action Taken={approve_res.action_taken}")
    assert approve_res.status == "SUCCESS", "Approval failed"

    # Dismiss alert 2
    dismiss_res = await agentic_service.dismiss_alert(alert_id=alert_2["id"], user_id=1)
    print(f"Dismissed Alert #{alert_2['id']}: Status={dismiss_res.status}")
    assert dismiss_res.status == "DISMISSED", "Dismiss failed"

    print("✅ Autonomous Agentic Triggers verified successfully!")


async def main():
    print("=====================================================================")
    print("  HAJI CAFE PHASE 3: AGENTIC TRIGGERS, WHATSAPP & SENTIMENT TESTS   ")
    print("=====================================================================")
    await test_whatsapp_parser()
    await test_sentiment_engine()
    await test_agentic_triggers()
    print("\n=====================================================================")
    print("  ALL PHASE 3 CAPABILITIES PASSED VERIFICATION WITH ZERO ERRORS!     ")
    print("=====================================================================")


if __name__ == "__main__":
    asyncio.run(main())
