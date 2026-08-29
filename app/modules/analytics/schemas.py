from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ForecastDataPoint(BaseModel):
    date: str
    day_name: str
    is_forecast: bool = False
    revenue: Optional[float] = None
    orders: Optional[int] = None
    predicted_revenue: Optional[float] = None
    predicted_orders: Optional[int] = None
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None
    is_anomaly: bool = False
    anomaly_type: Optional[str] = None
    anomaly_reason: Optional[str] = None


class AnomalyItem(BaseModel):
    date: str
    day_name: str
    actual_revenue: float
    expected_revenue: float
    difference_pct: float
    type: str  # "SPIKE" or "DIP"
    severity: str  # "HIGH", "MEDIUM", "LOW"
    explanation: str


class ItemDemandForecast(BaseModel):
    item_name: str
    category: str
    current_daily_avg: float
    predicted_7d_total: int
    peak_day: str
    recommended_prep_qty: int
    confidence_score: float
    insight: str


class SalesForecastResponse(BaseModel):
    branch_id: Optional[int] = None
    cafe_id: Optional[int] = None
    history_days: int
    forecast_days: int
    model_used: str = "Harmonic Fourier Ridge Regression"
    r2_score: float
    mape_pct: float
    current_daily_avg_revenue: float
    projected_30d_revenue: float
    projected_growth_rate_pct: float
    peak_forecast_day: str
    peak_forecast_revenue: float
    timeline: List[ForecastDataPoint]
    anomalies: List[AnomalyItem]
    dynamic_pricing_tips: List[str]


class KPISummaryResponse(BaseModel):
    today_revenue: float
    today_orders: int
    yesterday_revenue: float
    yesterday_orders: int
    rev_growth_pct: float
    orders_growth_pct: float
    avg_order_value: float
    active_orders_count: int
    completed_orders_total: int
    low_stock_items_count: int
    top_selling_item: str
    top_selling_category: str
    customer_satisfaction_score: float  # e.g. 96.4%


class PeakHourPoint(BaseModel):
    hour: int
    hour_label: str
    avg_orders: float
    avg_revenue: float
    intensity: float  # 0.0 to 1.0


class PeakHoursResponse(BaseModel):
    branch_id: Optional[int] = None
    busiest_hour: int
    busiest_hour_label: str
    peak_order_rate: float
    recommended_shift_staff: int
    hourly_distribution: List[PeakHourPoint]
    day_of_week_distribution: List[Dict[str, Any]]


class BCGItem(BaseModel):
    item_name: str
    category: str
    sales_volume: int
    revenue_generated: float
    unit_price: float
    estimated_margin_pct: float
    quadrant: str  # "STAR", "CASH_COW", "PUZZLE", "DOG"
    action_recommendation: str


class BCGMatrixResponse(BaseModel):
    branch_id: Optional[int] = None
    total_menu_items: int
    stars: List[BCGItem]
    cash_cows: List[BCGItem]
    puzzles: List[BCGItem]
    dogs: List[BCGItem]
    strategic_summary: str
