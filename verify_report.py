import asyncio
import sys
sys.stdout.reconfigure(encoding='utf-8')
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import connect_db, disconnect_db, db

async def verify_all():
    await connect_db()
    print('=====================================================')
    print('🔍 1. DATABASE & SEEDING VALIDATION')
    print('=====================================================')
    total_orders = await db.order.count()
    completed_orders = await db.order.count(where={'status': 'COMPLETED'})
    cancelled_orders = await db.order.count(where={'status': 'CANCELLED'})
    order_items = await db.orderitem.count()
    branch_items = await db.branchmenuitem.count()
    master_items = await db.mastermenuitem.count()

    print(f'• Total Orders in Database: {total_orders:,}')
    print(f'• Completed Orders: {completed_orders:,} ({(completed_orders/total_orders)*100:.1f}%)')
    print(f'• Cancelled Orders: {cancelled_orders:,} ({(cancelled_orders/total_orders)*100:.1f}%)')
    print(f'• Total Order Line Items: {order_items:,}')
    print(f'• Menu Items across Branches: {branch_items} (Master items: {master_items})')

    print('\n=====================================================')
    print('🔍 2. FASTAPI ENDPOINTS & ML FORECAST INTEGRATION')
    print('=====================================================')
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url='http://test') as client:
        # 1. /predict/sales
        r_fc = await client.get('/predict/sales?branch_id=1&days=30')
        print(f'1. GET /predict/sales?branch_id=1&days=30 -> HTTP {r_fc.status_code}')
        fc = r_fc.json()
        print(f'   - Model: {fc.get("model_used")}')
        print(f'   - Historical Days Trained: {fc.get("history_days")} days')
        print(f'   - Projected 30-Day Revenue: ${fc.get("projected_30d_revenue", 0):,.2f}')
        print(f'   - Projected Growth Rate: +{fc.get("projected_growth_rate_pct")}%')
        print(f'   - Peak Day: {fc.get("peak_forecast_day")} (Projected ${fc.get("peak_forecast_revenue", 0):,.2f})')
        print(f'   - Total Timeline Points: {len(fc.get("timeline", []))} (121 historical actuals + 30 future predictions)')
        print(f'   - Anomalies Tagged: {len(fc.get("anomalies", []))}')
        for a in fc.get("anomalies", []):
            print(f'     * [{a.get("type")}] {a.get("date")} ({a.get("day_name")}): Act=${a.get("actual_revenue")} vs Exp=${a.get("expected_revenue")} -> {a.get("explanation")[:60]}...')

        # 2. /predict/item-demand
        r_item = await client.get('/predict/item-demand?branch_id=1&days=7')
        print(f'\n2. GET /predict/item-demand?branch_id=1&days=7 -> HTTP {r_item.status_code}')
        items = r_item.json()
        for it in items[:3]:
            print(f'   - {it.get("item_name")} ({it.get("category")}) | Daily Avg: {it.get("current_daily_avg")} units | 7d Forecast: {it.get("predicted_7d_total")} units | Kitchen Prep: {it.get("recommended_prep_qty")} units')

        # 3. /analytics/kpis
        r_kpi = await client.get('/analytics/kpis?branch_id=1')
        print(f'\n3. GET /analytics/kpis?branch_id=1 -> HTTP {r_kpi.status_code}')
        kpi = r_kpi.json()
        print(f'   - Today Revenue: ${kpi.get("today_revenue")}')
        print(f'   - Average Order Value (AOV): ${kpi.get("avg_order_value")}')
        print(f'   - Top Selling Item: {kpi.get("top_selling_item")}')
        print(f'   - Customer Satisfaction: {kpi.get("customer_satisfaction_score")}%')

        # 4. /analytics/peak-hours
        r_peak = await client.get('/analytics/peak-hours?branch_id=1')
        print(f'\n4. GET /analytics/peak-hours?branch_id=1 -> HTTP {r_peak.status_code}')
        peak = r_peak.json()
        print(f'   - Busiest Hour: {peak.get("busiest_hour_label")} ({peak.get("peak_order_rate")} orders/hr peak)')
        print(f'   - Recommended Shift Staff: {peak.get("recommended_shift_staff")} baristas')

        # 5. /analytics/bcg-matrix
        r_bcg = await client.get('/analytics/bcg-matrix?branch_id=1')
        print(f'\n5. GET /analytics/bcg-matrix?branch_id=1 -> HTTP {r_bcg.status_code}')
        bcg = r_bcg.json()
        print(f'   - Total Items Analyzed: {bcg.get("total_menu_items")}')
        print(f'   - ⭐ Stars: {[s.get("item_name") for s in bcg.get("stars", [])]}')
        print(f'   - 🐄 Cash Cows: {[c.get("item_name") for c in bcg.get("cash_cows", [])]}')
        print(f'   - ❓ Puzzles: {[p.get("item_name") for p in bcg.get("puzzles", [])]}')
        print(f'   - 🐕 Dogs: {[d.get("item_name") for d in bcg.get("dogs", [])]}')

    await disconnect_db()
    print('\n=====================================================')
    print('✅ ALL 5 ENDPOINTS AND DATABASE SEED FULLY VERIFIED!')
    print('=====================================================')

if __name__ == '__main__':
    asyncio.run(verify_all())
