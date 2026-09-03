import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class AgentAlertResponse(BaseModel):
    id: int
    branch_id: Optional[int] = None
    branch_name: Optional[str] = None
    cafe_id: Optional[int] = None
    trigger_type: str  # LOW_STOCK_DRAFT, SALES_DROP, STALE_ITEM_DISCOUNT
    severity: str = "MEDIUM"  # LOW, MEDIUM, HIGH, URGENT
    title: str
    message: str
    suggested_action: Optional[str] = None
    action_payload: Optional[Dict[str, Any]] = None
    status: str = "PENDING"  # PENDING, APPROVED, REJECTED, DISMISSED
    resolved_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class EvaluationSummary(BaseModel):
    evaluated_at: str
    total_evaluated_branches: int
    low_stock_alerts_generated: int
    sales_drop_alerts_generated: int
    stale_item_discounts_generated: int
    active_alerts_total: int
    alerts: List[AgentAlertResponse]


class ApproveAlertResponse(BaseModel):
    status: str
    message: str
    alert_id: int
    action_taken: str
    updated_payload: Optional[Dict[str, Any]] = None
