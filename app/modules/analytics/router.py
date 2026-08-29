from typing import Optional, List
from fastapi import APIRouter, Query, Depends, status

from app.modules.analytics import ml_service
from app.modules.analytics.schemas import (
    SalesForecastResponse,
    KPISummaryResponse,
    PeakHoursResponse,
    BCGMatrixResponse,
    ItemDemandForecast,
)

router = APIRouter()


# ── Predictive Sales & Demand Endpoints ───────────────────────────────

@router.get("/predict/sales", response_model=SalesForecastResponse, tags=["Predictive AI"])
async def predict_sales(
    branch_id: Optional[int] = Query(None, description="Optional branch ID to filter by"),
    cafe_id: Optional[int] = Query(None, description="Optional cafe ID to filter by"),
    days: int = Query(30, ge=7, le=90, description="Number of days to forecast into future"),
):
    """
    [AI/ML Engine] Forecast future sales revenue and order counts using
    Harmonic Fourier Ridge Regression with 95% confidence intervals and anomaly detection.
    """
    return await ml_service.generate_sales_forecast(
        branch_id=branch_id,
        cafe_id=cafe_id,
        forecast_days=days,
    )


@router.get("/predict/item-demand", response_model=List[ItemDemandForecast], tags=["Predictive AI"])
async def predict_item_demand(
    branch_id: Optional[int] = Query(None, description="Optional branch ID to filter by"),
    days: int = Query(7, ge=1, le=30, description="Days to forecast"),
):
    """
    [AI/ML Engine] Predict 7-day unit demand for top menu items with recommended kitchen preparation quantities.
    """
    return await ml_service.get_item_demand_forecast(branch_id=branch_id, days=days)


# ── Analytics & Business Intelligence Endpoints ───────────────────────

@router.get("/analytics/kpis", response_model=KPISummaryResponse, tags=["Analytics"])
async def get_kpis(
    branch_id: Optional[int] = Query(None, description="Optional branch ID"),
    cafe_id: Optional[int] = Query(None, description="Optional cafe ID"),
):
    """
    [Executive BI] Get real-time summary KPIs: Today's revenue, weekly growth %,
    active orders, low stock items, top sellers, and customer satisfaction score.
    """
    return await ml_service.get_kpi_summary(branch_id=branch_id, cafe_id=cafe_id)


@router.get("/analytics/peak-hours", response_model=PeakHoursResponse, tags=["Analytics"])
async def get_peak_hours(
    branch_id: Optional[int] = Query(None, description="Optional branch ID"),
    cafe_id: Optional[int] = Query(None, description="Optional cafe ID"),
):
    """
    [Operations BI] Get 24-hour hourly ordering density heatmap and optimal staff shift recommendation.
    """
    return await ml_service.get_peak_hours_analysis(branch_id=branch_id, cafe_id=cafe_id)


@router.get("/analytics/bcg-matrix", response_model=BCGMatrixResponse, tags=["Analytics"])
async def get_bcg_matrix(
    branch_id: Optional[int] = Query(None, description="Optional branch ID"),
    cafe_id: Optional[int] = Query(None, description="Optional cafe ID"),
):
    """
    [Menu Engineering] Classify menu items into BCG Matrix quadrants
    (⭐ Stars, 🐄 Cash Cows, ❓ Puzzles, 🐕 Dogs) with actionable profitability recommendations.
    """
    return await ml_service.get_bcg_menu_matrix(branch_id=branch_id, cafe_id=cafe_id)


# ── Scoped Route Aliases for Cafe & Branch Contexts ───────────────────

@router.get("/branches/{branch_id}/analytics/forecast", response_model=SalesForecastResponse, tags=["Analytics"])
async def get_branch_forecast(
    branch_id: int,
    days: int = Query(30, ge=7, le=90),
):
    return await ml_service.generate_sales_forecast(branch_id=branch_id, forecast_days=days)


@router.get("/branches/{branch_id}/analytics/kpis", response_model=KPISummaryResponse, tags=["Analytics"])
async def get_branch_kpis(branch_id: int):
    return await ml_service.get_kpi_summary(branch_id=branch_id)


@router.get("/cafes/{cafe_id}/analytics/forecast", response_model=SalesForecastResponse, tags=["Analytics"])
async def get_cafe_forecast(
    cafe_id: int,
    days: int = Query(30, ge=7, le=90),
):
    return await ml_service.generate_sales_forecast(cafe_id=cafe_id, forecast_days=days)


@router.get("/cafes/{cafe_id}/analytics/kpis", response_model=KPISummaryResponse, tags=["Analytics"])
async def get_cafe_kpis(cafe_id: int):
    return await ml_service.get_kpi_summary(cafe_id=cafe_id)
