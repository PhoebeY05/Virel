from __future__ import annotations

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.api.deps import get_request_db
from app.auth import CurrentUser, get_current_user
from app.schemas import (
    PlatformAccountCreate,
    PlatformAccountRead,
    PlatformAccountUpdate,
    ProjectCreate,
    ProjectRead,
    ProjectUpdate,
)
from app.services import (
    create_platform_account,
    create_project,
    delete_platform_account,
    delete_project,
    ensure_user,
    ensure_owned_project,
    list_platform_accounts,
    list_projects,
    update_platform_account,
    update_project,
)

router = APIRouter(tags=["projects"])


@router.get("/projects", response_model=list[ProjectRead])
def get_projects(
    db: Session = Depends(get_request_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> list[ProjectRead]:
    user = ensure_user(db, current_user)
    return list_projects(db, user.id)


@router.post("/projects", response_model=ProjectRead, status_code=201)
def post_project(
    payload: ProjectCreate,
    db: Session = Depends(get_request_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ProjectRead:
    user = ensure_user(db, current_user)
    return create_project(db, user, payload)


@router.get("/projects/{project_id}", response_model=ProjectRead)
def get_project(
    project_id: str,
    db: Session = Depends(get_request_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ProjectRead:
    user = ensure_user(db, current_user)
    return ensure_owned_project(db, project_id, user.id)


@router.patch("/projects/{project_id}", response_model=ProjectRead)
def patch_project(
    project_id: str,
    payload: ProjectUpdate,
    db: Session = Depends(get_request_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ProjectRead:
    user = ensure_user(db, current_user)
    return update_project(db, project_id, user.id, payload)


@router.delete("/projects/{project_id}", status_code=204)
def remove_project(
    project_id: str,
    db: Session = Depends(get_request_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> Response:
    user = ensure_user(db, current_user)
    delete_project(db, project_id, user.id)
    return Response(status_code=204)


@router.get("/projects/{project_id}/accounts", response_model=list[PlatformAccountRead])
def get_accounts(
    project_id: str,
    db: Session = Depends(get_request_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> list[PlatformAccountRead]:
    user = ensure_user(db, current_user)
    return list_platform_accounts(db, project_id, user.id)


@router.post("/projects/{project_id}/accounts", response_model=PlatformAccountRead, status_code=201)
def post_account(
    project_id: str,
    payload: PlatformAccountCreate,
    db: Session = Depends(get_request_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> PlatformAccountRead:
    user = ensure_user(db, current_user)
    return create_platform_account(db, project_id, user.id, payload)


@router.patch("/accounts/{account_id}", response_model=PlatformAccountRead)
def patch_account(
    account_id: str,
    payload: PlatformAccountUpdate,
    db: Session = Depends(get_request_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> PlatformAccountRead:
    user = ensure_user(db, current_user)
    return update_platform_account(db, account_id, user.id, payload)


@router.delete("/accounts/{account_id}", status_code=204)
def remove_account(
    account_id: str,
    db: Session = Depends(get_request_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> Response:
    user = ensure_user(db, current_user)
    delete_platform_account(db, account_id, user.id)
    return Response(status_code=204)

