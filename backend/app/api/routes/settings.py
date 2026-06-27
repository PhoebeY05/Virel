from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_request_db
from app.auth import CurrentUser, get_current_user
from app.schemas import UserSettingsRead, UserSettingsUpdate
from app.services import ensure_user, ensure_user_settings, update_user_settings

router = APIRouter(tags=["settings"])


@router.get("/settings", response_model=UserSettingsRead)
def get_settings(
    db: Session = Depends(get_request_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> UserSettingsRead:
    user = ensure_user(db, current_user)
    return ensure_user_settings(db, user)


@router.put("/settings", response_model=UserSettingsRead)
def put_settings(
    payload: UserSettingsUpdate,
    db: Session = Depends(get_request_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> UserSettingsRead:
    user = ensure_user(db, current_user)
    return update_user_settings(db, user, payload)
