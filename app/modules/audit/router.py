# app/modules/audit/router.py
from fastapi import APIRouter, Depends
from app.middleware.rbac import require_cafe_access
from app.modules.audit import service
from app.utils.serializer import prisma_to_dict

router = APIRouter()

@router.get("/cafes/{cafe_id}/audit-logs")
async def get_audit_logs(
    cafe_id: int,
    _=Depends(require_cafe_access()),
):
    """[CAFE_OWNER, SUPER_ADMIN] Get recent audit logs for a café and its branches."""
    logs = await service.get_audit_logs_for_cafe(cafe_id)
    return logs
