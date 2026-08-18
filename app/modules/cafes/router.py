from fastapi import APIRouter, Depends, status, HTTPException

from app.core.dependencies import get_current_user
from app.middleware.rbac import require_cafe_access, require_role
from app.modules.cafes import service
from app.modules.cafes.schemas import (
    BranchCreate,
    BranchUpdate,
    CafeCreate,
    CafeUpdate,
    MeetingCreate,
)
from app.utils.serializer import prisma_to_dict

router = APIRouter()


# ── Cafe Endpoints ──────────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_cafe(
    body: CafeCreate,
    _=Depends(require_role("SUPER_ADMIN")),
):
    """[SUPER_ADMIN] Create a new café."""
    return prisma_to_dict(await service.create_cafe(body.name, body.owner_id))


@router.get("")
async def list_cafes(
    current_user=Depends(get_current_user),
):
    """[SUPER_ADMIN, CAFE_OWNER] List cafés. Super Admins see all, Owners see theirs."""
    if current_user.role.name == "SUPER_ADMIN":
        return prisma_to_dict(await service.get_all_cafes())
    elif current_user.role.name == "CAFE_OWNER":
        return prisma_to_dict(await service.get_cafes_by_owner(current_user.id))
    raise HTTPException(status_code=403, detail="Not authorized to view cafés.")


@router.get("/{cafe_id}")
async def get_cafe(
    cafe_id: int,
    _=Depends(require_cafe_access()),
):
    """[SUPER_ADMIN, CAFE_OWNER] Get a single café by ID."""
    return prisma_to_dict(await service.get_cafe(cafe_id))


@router.put("/{cafe_id}")
async def update_cafe(
    cafe_id: int,
    body: CafeUpdate,
    _=Depends(require_cafe_access()),
):
    """[SUPER_ADMIN, CAFE_OWNER] Update café details."""
    return prisma_to_dict(await service.update_cafe(cafe_id, body.name))


@router.delete("/{cafe_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cafe(
    cafe_id: int,
    _=Depends(require_role("SUPER_ADMIN")),
):
    """[SUPER_ADMIN] Delete a café."""
    await service.delete_cafe(cafe_id)


# ── Branch Endpoints ────────────────────────────────────────────────

@router.post("/{cafe_id}/branches", status_code=status.HTTP_201_CREATED)
async def create_branch(
    cafe_id: int,
    body: BranchCreate,
    _=Depends(require_cafe_access()),
):
    """[SUPER_ADMIN, CAFE_OWNER] Add a branch to a café."""
    return prisma_to_dict(await service.create_branch(cafe_id, body.name, body.location))


@router.get("/{cafe_id}/branches")
async def list_branches(
    cafe_id: int,
    _=Depends(require_cafe_access()),
):
    """[SUPER_ADMIN, CAFE_OWNER] List all branches of a café."""
    return prisma_to_dict(await service.get_branches(cafe_id))


@router.put("/{cafe_id}/branches/{branch_id}")
async def update_branch(
    cafe_id: int,
    branch_id: int,
    body: BranchUpdate,
    _=Depends(require_cafe_access()),
):
    """[SUPER_ADMIN, CAFE_OWNER, BRANCH_MANAGER] Update branch details."""
    return prisma_to_dict(await service.update_branch(cafe_id, branch_id, body.model_dump()))


@router.delete("/{cafe_id}/branches/{branch_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_branch(
    cafe_id: int,
    branch_id: int,
    _=Depends(require_cafe_access()),
):
    """[SUPER_ADMIN, CAFE_OWNER] Delete a branch."""
    await service.delete_branch(cafe_id, branch_id)


# ── Staff Endpoints ─────────────────────────────────────────────────

@router.get("/{cafe_id}/staff")
async def list_staff(
    cafe_id: int,
    _=Depends(require_cafe_access()),
):
    """[SUPER_ADMIN, CAFE_OWNER] List all staff members (Branch Managers and Staff) for a café."""
    staff = await service.get_cafe_staff(cafe_id)
    return [
        {"id": u.id, "email": u.email, "role": u.role.name if u.role else None}
        for u in staff
    ]


# ── Meeting Endpoints ────────────────────────────────────────────────

@router.post("/{cafe_id}/meetings", status_code=status.HTTP_201_CREATED)
async def schedule_meeting(
    cafe_id: int,
    body: MeetingCreate,
    current_user=Depends(get_current_user),
    _=Depends(require_cafe_access()),
):
    """[CAFE_OWNER] Schedule a Google Calendar meeting and send invites to selected staff members."""
    return await service.schedule_staff_meeting(
        cafe_id=cafe_id,
        owner_user_id=current_user.id,
        summary=body.summary,
        description=body.description,
        start_time=body.start_time,
        end_time=body.end_time,
        attendee_user_ids=body.attendee_user_ids,
    )
