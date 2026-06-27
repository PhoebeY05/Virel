from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_request_db
from app.auth import CurrentUser, get_current_user
from app.schemas import AutomationConnectRequest, AutomationSessionCreate, AutomationSessionRead, AutomationSessionUpdate
from app.services import connect_automation, create_automation_session, ensure_user, get_automation_session, update_automation_session

router = APIRouter(tags=["automation"])


@router.post("/automation/sessions", response_model=AutomationSessionRead, status_code=201)
def post_automation_session(
    payload: AutomationSessionCreate,
    db: Session = Depends(get_request_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> AutomationSessionRead:
    user = ensure_user(db, current_user)
    return create_automation_session(db, user.id, payload)


@router.post("/automation/connect", response_model=AutomationSessionRead, status_code=201)
def connect_automation_session(
    payload: AutomationConnectRequest,
    db: Session = Depends(get_request_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> AutomationSessionRead:
    user = ensure_user(db, current_user)
    return connect_automation(db, user.id, payload)


@router.get("/automation/sessions/{session_id}", response_model=AutomationSessionRead)
def get_automation(
    session_id: str,
    db: Session = Depends(get_request_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> AutomationSessionRead:
    user = ensure_user(db, current_user)
    return get_automation_session(db, session_id, user.id)


@router.patch("/automation/sessions/{session_id}", response_model=AutomationSessionRead)
def patch_automation(
    session_id: str,
    payload: AutomationSessionUpdate,
    db: Session = Depends(get_request_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> AutomationSessionRead:
    user = ensure_user(db, current_user)
    return update_automation_session(db, session_id, user.id, payload)

