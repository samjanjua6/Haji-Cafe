# app/modules/audit/service.py
from typing import Optional
from app.modules.audit import repository

async def log_action(user_id: int, action: str, details: Optional[str] = None, cafe_id: Optional[int] = None, branch_id: Optional[int] = None):
    return await repository.create_audit_log(user_id, action, details, cafe_id, branch_id)

async def get_audit_logs_for_cafe(cafe_id: int):
    logs = await repository.get_audit_logs_by_cafe(cafe_id)
    result = []
    for log in logs:
        result.append({
            "id": log.id,
            "user_id": log.userId,
            "action": log.action,
            "details": log.details,
            "created_at": log.createdAt,
            "cafe_id": log.cafeId,
            "branch_id": log.branchId,
            "user_email": log.user.email if log.user else None,
            "branch_name": log.branch.name if log.branch else None,
        })
    return result
