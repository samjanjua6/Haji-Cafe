# app/modules/audit/repository.py
from typing import Optional
from app.database import db

async def create_audit_log(user_id: int, action: str, details: Optional[str] = None, cafe_id: Optional[int] = None, branch_id: Optional[int] = None):
    return await db.auditlog.create(
        data={
            "userId": user_id,
            "action": action,
            "details": details,
            "cafeId": cafe_id,
            "branchId": branch_id
        }
    )

async def get_audit_logs_by_cafe(cafe_id: int):
    # Fetch logs for the cafe or for branches belonging to the cafe
    return await db.auditlog.find_many(
        where={
            "OR": [
                {"cafeId": cafe_id},
                {"branch": {"cafeId": cafe_id}}
            ]
        },
        order={"createdAt": "desc"},
        include={"user": True, "branch": True, "cafe": True},
        take=100
    )
