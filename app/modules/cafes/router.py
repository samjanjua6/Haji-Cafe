from fastapi import APIRouter, Depends, status

from app.middleware.rbac import require_cafe_access, require_role
from app.modules.cafes import service
from app.modules.cafes.schemas import (
    BranchCreate,
    BranchUpdate,
    CafeCreate,
    CafeUpdate,
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
    _=Depends(require_role("SUPER_ADMIN")),
):
    """[SUPER_ADMIN] List all cafés on the platform."""
    return prisma_to_dict(await service.get_all_cafes())


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
