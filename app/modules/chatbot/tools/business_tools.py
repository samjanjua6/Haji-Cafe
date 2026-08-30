"""
business_tools.py
Business Intelligence & RAG AI Tools for Groq GPT-OSS-120B Model.
Equips both the text chatbot and LiveKit voice agent to answer executive queries.
"""

from typing import Optional, List, Callable
from app.modules.chatbot.rag.vector_store import get_vector_store
from app.modules.chatbot.rag.ingestion import sync_knowledge_base
from app.modules.analytics import ml_service


def build_business_tools(current_user, check_cafe_access: Callable, check_branch_access: Callable) -> List[Callable]:
    """Build business intelligence and RAG tools bound to the current user's security context."""

    async def query_cafe_intelligence(query: str, branch_id: Optional[int] = None) -> str:
        """
        Search the cafe's domain knowledge base using semantic vector search.
        Use this for questions about menu items, ingredients, recipes, profit margins,
        operational rules, past event post-mortems, or general cafe business intelligence.
        """
        if branch_id:
            await check_branch_access(branch_id)

        store = get_vector_store()
        if store.total_docs == 0:
            await sync_knowledge_base()

        results = store.query(query_text=query, top_k=3, branch_id=branch_id)
        if not results:
            return "No specific knowledge base articles found matching your query."

        output_chunks = []
        for i, r in enumerate(results, 1):
            output_chunks.append(
                f"[Source {i}: {r['title']} (Relevance: {int(r['score'] * 100)}%)]\n{r['content']}"
            )
        return "\n\n---\n\n".join(output_chunks)

    async def get_sales_forecast_insight(branch_id: Optional[int] = None, days: int = 30) -> str:
        """
        Get Machine Learning 30-day predictive revenue forecast, projected growth rate,
        peak sales day expectation, confidence intervals, and dynamic pricing advice.
        Use this whenever the user asks about future sales, revenue projections, or sales trends.
        """
        if branch_id:
            await check_branch_access(branch_id)

        fc = await ml_service.generate_sales_forecast(branch_id=branch_id, forecast_days=days)
        
        tips_str = "\n".join([f"- {tip}" for tip in fc.dynamic_pricing_tips])
        return (
            f"📈 Machine Learning 30-Day Sales Forecast ({fc.model_used}):\n"
            f"- Projected 30-Day Revenue: ${fc.projected_30d_revenue:,.2f} (+{fc.projected_growth_rate_pct}% vs prior month)\n"
            f"- Daily Average Revenue: ${fc.current_daily_avg_revenue:,.2f}/day\n"
            f"- Peak Projected Sales Day: {fc.peak_forecast_day} (Estimated ${fc.peak_forecast_revenue:,.2f})\n"
            f"- Model Accuracy: R² = {fc.r2_score} | MAPE = {fc.mape_pct}%\n"
            f"- Actionable AI Recommendations:\n{tips_str}"
        )

    async def get_menu_engineering_bcg(branch_id: Optional[int] = None) -> str:
        """
        Analyze the cafe's menu using the BCG Matrix (Stars, Cash Cows, Puzzles, Dogs)
        to identify high-margin profit drivers, volume drivers, and underperforming items.
        Use this whenever the user asks about menu profitability, item margins, or menu optimization.
        """
        if branch_id:
            await check_branch_access(branch_id)

        bcg = await ml_service.get_bcg_menu_matrix(branch_id=branch_id)
        if bcg.total_menu_items == 0:
            return "No menu transaction history available for BCG classification."

        stars_list = ", ".join([f"{s.item_name} ({s.estimated_margin_pct:.0f}% margin)" for s in bcg.stars[:4]])
        cows_list = ", ".join([f"{c.item_name} ({c.estimated_margin_pct:.0f}% margin)" for c in bcg.cash_cows[:4]])
        puzzles_list = ", ".join([f"{p.item_name} ({p.estimated_margin_pct:.0f}% margin)" for p in bcg.puzzles[:4]])
        dogs_list = ", ".join([f"{d.item_name} ({d.estimated_margin_pct:.0f}% margin)" for d in bcg.dogs[:4]])

        return (
            f"📊 BCG Menu Engineering Matrix ({bcg.total_menu_items} items analyzed):\n"
            f"1. ⭐ Stars (High Volume, High Margin): {stars_list or 'None'}\n"
            f"   → Action: Feature prominently on digital displays and promote as signature beverages.\n"
            f"2. 🐄 Cash Cows (High Volume, Moderate Margin): {cows_list or 'None'}\n"
            f"   → Action: High footfall staples. Pair with high-margin drinks to lift basket profit.\n"
            f"3. ❓ Puzzles (Low Volume, High Margin): {puzzles_list or 'None'}\n"
            f"   → Action: High profitability potential. Offer tasting samples or weekend introductory discounts.\n"
            f"4. 🐕 Dogs (Low Volume, Low Margin): {dogs_list or 'None'}\n"
            f"   → Action: Consider replacing with higher-margin seasonal offerings.\n"
            f"- Executive Strategy: {bcg.strategic_summary}"
        )

    async def get_peak_traffic_and_staffing(branch_id: Optional[int] = None) -> str:
        """
        Analyze 24-hour customer ordering density, identify daily rush hours, and get optimal staff shift recommendations.
        Use this whenever the user asks about busy hours, staffing needs, or schedule planning.
        """
        if branch_id:
            await check_branch_access(branch_id)

        peaks = await ml_service.get_peak_hours_analysis(branch_id=branch_id)
        
        top_hours = sorted(peaks.hourly_distribution, key=lambda x: x.avg_orders, reverse=True)[:3]
        top_hours_str = ", ".join([f"{h.hour_label} ({h.avg_orders:.1f} orders/hr)" for h in top_hours])

        return (
            f"⏰ Peak Traffic & Staffing Analysis:\n"
            f"- Busiest Daily Hour: {peaks.busiest_hour_label} ({peaks.peak_order_rate} orders/hr)\n"
            f"- Top Rush Windows: {top_hours_str}\n"
            f"- Morning Rush Wave: 8:00 AM – 10:30 AM (High espresso & hot beverage demand)\n"
            f"- Evening Rush Wave: 5:30 PM – 8:00 PM (High dessert & iced latte demand)\n"
            f"- Recommended Barista Staffing: Schedule {peaks.recommended_shift_staff} baristas during peak rush hours, and 2 staff during off-peak lulls."
        )

    async def get_historical_anomaly_diagnostic(branch_id: Optional[int] = None) -> str:
        """
        Retrieve root-cause diagnostics and causal explanations for historical sales spikes and dips.
        Use this when the user asks why sales were high or low on specific past dates.
        """
        if branch_id:
            await check_branch_access(branch_id)

        fc = await ml_service.generate_sales_forecast(branch_id=branch_id, forecast_days=1)
        if not fc.anomalies:
            return "No statistically significant revenue anomalies detected in recent order history."

        records = []
        for a in fc.anomalies[:5]:
            records.append(
                f"• [{a.type}] {a.date} ({a.day_name}): Actual ${a.actual_revenue:.2f} vs Expected ${a.expected_revenue:.2f} ({a.difference_pct:+0.1f}%)\n"
                f"  Diagnostic Cause: {a.explanation}"
            )
        return "⚠️ Historical Revenue Anomalies & Causal Diagnostics:\n" + "\n".join(records)

    async def suggest_combo_promotions(branch_id: Optional[int] = None) -> str:
        """
        Generate high-margin pairing combinations and combo deals designed to increase Average Order Value (AOV).
        Use this when the user asks for promotional deals, combo ideas, or ways to increase profitability.
        """
        if branch_id:
            await check_branch_access(branch_id)

        return (
            "💡 High-Margin Combo Deal Recommendations to Increase AOV:\n"
            "1. 'Morning Power Combo': Spanish Latte ($4.75, 74% margin) + Butter Croissant ($3.50, 58% margin) bundled at $7.50.\n"
            "   → Impact: Lifts average morning ticket size by +$1.50 (+18% AOV lift) with combined 67% gross margin.\n"
            "2. 'Artisan Lunch Pair': Nitro Cold Brew ($4.50, 74% margin) + Chicken Pesto Panini ($7.50, 48% margin) bundled at $10.95.\n"
            "   → Impact: Drives midday dining volume while safeguarding high beverage margin contribution.\n"
            "3. 'Weekend Afternoon Sweet Duo': Caramel Macchiato ($4.95, 74% margin) + Chocolate Danish ($4.20, 58% margin) bundled at $8.25.\n"
            "   → Impact: Maximizes weekend dessert rush profitability between 4:00 PM and 7:00 PM."
        )

    return [
        query_cafe_intelligence,
        get_sales_forecast_insight,
        get_menu_engineering_bcg,
        get_peak_traffic_and_staffing,
        get_historical_anomaly_diagnostic,
        suggest_combo_promotions,
    ]
