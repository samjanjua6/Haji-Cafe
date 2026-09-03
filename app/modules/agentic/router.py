from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, status

from app.core.dependencies import get_current_user
from app.modules.agentic import service
from app.modules.agentic.schemas import AgentAlertResponse, EvaluationSummary, ApproveAlertResponse

router = APIRouter(prefix="/agentic", tags=["Agentic AI Triggers"])


@router.post("/evaluate", response_model=EvaluationSummary)
async def evaluate_agentic_triggers(
    branch_id: Optional[int] = Query(None, description="Optional branch ID to scope evaluation"),
    current_user=Depends(get_current_user),
):
    """
    [CAFE_OWNER, BRANCH_MANAGER, SUPER_ADMIN]
    Manually trigger autonomous evaluation cycles for:
    1. Low-stock draft POs
    2. Sales dip diagnostics
    3. Stale unsold item discounts
    """
    return await service.run_all_evaluations(branch_id=branch_id)


@router.get("/alerts", response_model=List[AgentAlertResponse])
async def list_agentic_alerts(
    branch_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None, description="Filter by PENDING, APPROVED, DISMISSED"),
    current_user=Depends(get_current_user),
):
    """List generated autonomous alerts and recommendations."""
    raw_alerts = await service.get_all_alerts(branch_id=branch_id, status=status)
    return [AgentAlertResponse(**a) for a in raw_alerts]


@router.post("/alerts/{alert_id}/approve", response_model=ApproveAlertResponse)
async def approve_agentic_alert(
    alert_id: int,
    current_user=Depends(get_current_user),
):
    """
    [1-CLICK EXECUTION]
    Approve and auto-execute the recommended action:
    - For Low-Stock POs: Replenishes inventory units and records to StockHistoryLog.
    - For Stale Items: Applies promotional discounted price override to branch menu.
    - For Sales Dips: Acknowledges diagnostic and activates promotional campaign.
    """
    try:
        return await service.approve_alert(alert_id=alert_id, user_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/alerts/{alert_id}/dismiss", response_model=ApproveAlertResponse)
async def dismiss_agentic_alert(
    alert_id: int,
    current_user=Depends(get_current_user),
):
    """Dismiss an active autonomous alert."""
    try:
        return await service.dismiss_alert(alert_id=alert_id, user_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
