from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, Response
from pydantic import BaseModel

from app.core.dependencies import get_current_user
from app.core.exceptions import ForbiddenException, BadRequestException
from app.modules.scheduling import service

router = APIRouter(prefix="/scheduling", tags=["Scheduling & Workforce AI"])


class GenerateShiftsRequest(BaseModel):
    branch_id: int
    target_date: Optional[str] = None
    demand_multiplier: Optional[float] = 1.0


class SyncCalendarRequest(BaseModel):
    cafe_id: int
    branch_name: str
    shifts: List[Dict[str, Any]]


def verify_scheduling_access(
    current_user: Any,
    branch_id: Optional[int] = None,
    cafe_id: Optional[int] = None
):
    """
    Enforces multi-tenant RBAC:
    - SUPER_ADMIN: Global access
    - CAFE_OWNER: Can access any branch belonging to their cafe or cafe-wide
    - BRANCH_MANAGER / STAFF: Strictly locked to their assigned branchId.
    """
    role = current_user.role.name if current_user.role else "STAFF"

    if role == "SUPER_ADMIN":
        return

    user_branch_ids = [s.branchId for s in current_user.userScopes if s.branchId is not None]
    user_cafe_ids = [s.cafeId for s in current_user.userScopes if s.cafeId is not None]

    if role == "CAFE_OWNER":
        if cafe_id and cafe_id not in user_cafe_ids:
            raise ForbiddenException("Access denied: You do not own this cafe.")
        # If branch_id is specified, owner can access if the branch belongs to their cafe
        return

    # For BRANCH_MANAGER and STAFF:
    if cafe_id and not branch_id:
        raise ForbiddenException("Access denied: Branch Managers can only view their assigned branch, not full cafe aggregation.")

    if branch_id and branch_id not in user_branch_ids:
        raise ForbiddenException(f"Access denied: You are not authorized to view or manage Branch #{branch_id}.")


@router.get("/peak-hours")
async def get_peak_hours(
    branch_id: Optional[int] = Query(None, description="Branch ID to analyze"),
    cafe_id: Optional[int] = Query(None, description="Cafe ID for multi-branch analysis"),
    multiplier: float = Query(1.0, description="Demand surge multiplier (e.g. 1.3 for +30% rush)"),
    current_user: Any = Depends(get_current_user)
):
    """
    Returns 24-hour order arrival rate (lambda), Erlang-C staffing requirements,
    and identifies peak rush windows.
    """
    # Auto-resolve defaults based on user scope if not provided
    if not branch_id and not cafe_id:
        user_branch_ids = [s.branchId for s in current_user.userScopes if s.branchId is not None]
        user_cafe_ids = [s.cafeId for s in current_user.userScopes if s.cafeId is not None]
        if user_branch_ids:
            branch_id = user_branch_ids[0]
        elif user_cafe_ids:
            cafe_id = user_cafe_ids[0]

    verify_scheduling_access(current_user, branch_id=branch_id, cafe_id=cafe_id)

    data = await service.get_peak_hour_analysis(
        branch_id=branch_id,
        cafe_id=cafe_id,
        demand_multiplier=multiplier
    )
    return {"status": "success", "data": data}


@router.post("/generate-shifts")
async def generate_shifts(
    body: GenerateShiftsRequest,
    current_user: Any = Depends(get_current_user)
):
    """
    AI Workforce Engine: Generates an optimized staff roster matching branch staff
    to Erlang-C requirements with financial ROI and executive business rationale.
    """
    verify_scheduling_access(current_user, branch_id=body.branch_id)

    data = await service.generate_ai_shift_schedule(
        branch_id=body.branch_id,
        target_date_str=body.target_date,
        demand_multiplier=body.demand_multiplier or 1.0
    )
    return {"status": "success", "data": data}


@router.post("/sync-calendar")
async def sync_calendar(
    body: SyncCalendarRequest,
    current_user: Any = Depends(get_current_user)
):
    """
    Syncs scheduled shifts directly into Google Calendar via Google Calendar API.
    """
    verify_scheduling_access(current_user, cafe_id=body.cafe_id)

    data = await service.sync_shifts_to_google_calendar(
        owner_user_id=current_user.id,
        cafe_id=body.cafe_id,
        branch_name=body.branch_name,
        shifts=body.shifts
    )
    return {"status": "success", "data": data}


@router.get("/export-ics")
async def export_ics(
    branch_id: int = Query(..., description="Branch ID"),
    target_date: Optional[str] = Query(None, description="Date for shifts"),
    multiplier: float = Query(1.0, description="Demand multiplier"),
    current_user: Any = Depends(get_current_user)
):
    """
    Generates and returns an RFC 5545 .ics iCalendar file for Apple Calendar, Outlook, and Google Calendar.
    """
    verify_scheduling_access(current_user, branch_id=branch_id)

    schedule_data = await service.generate_ai_shift_schedule(
        branch_id=branch_id,
        target_date_str=target_date,
        demand_multiplier=multiplier
    )

    ics_text = service.generate_ics_calendar_file(
        branch_name=schedule_data.get("branch_name", f"Branch #{branch_id}"),
        shifts=schedule_data.get("shifts", [])
    )

    return Response(
        content=ics_text,
        media_type="text/calendar",
        headers={
            "Content-Disposition": f"attachment; filename=shifts_branch_{branch_id}_{schedule_data['target_date']}.ics"
        }
    )
