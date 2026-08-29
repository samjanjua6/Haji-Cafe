from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import connect_db, disconnect_db


async def test_analytics_and_forecast_endpoints():
    await connect_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Test sales forecast
        r_fc = await client.get("/predict/sales?branch_id=1&days=30")
        assert r_fc.status_code == 200
        fc_data = r_fc.json()
        assert "timeline" in fc_data
        assert len(fc_data["timeline"]) >= 30
        assert fc_data["projected_30d_revenue"] > 0
        assert "anomalies" in fc_data

        # 2. Test item demand prediction
        r_item = await client.get("/predict/item-demand?branch_id=1&days=7")
        assert r_item.status_code == 200
        items_data = r_item.json()
        assert len(items_data) > 0
        assert "recommended_prep_qty" in items_data[0]

        # 3. Test KPIs summary
        r_kpi = await client.get("/analytics/kpis?branch_id=1")
        assert r_kpi.status_code == 200
        kpi_data = r_kpi.json()
        assert "today_revenue" in kpi_data
        assert "top_selling_item" in kpi_data

        # 4. Test Peak Hours heatmap
        r_peaks = await client.get("/analytics/peak-hours?branch_id=1")
        assert r_peaks.status_code == 200
        peaks_data = r_peaks.json()
        assert len(peaks_data["hourly_distribution"]) == 24
        assert peaks_data["recommended_shift_staff"] >= 1

        # 5. Test BCG Matrix
        r_bcg = await client.get("/analytics/bcg-matrix?branch_id=1")
        assert r_bcg.status_code == 200
        bcg_data = r_bcg.json()
        assert len(bcg_data["stars"]) > 0

    await disconnect_db()
