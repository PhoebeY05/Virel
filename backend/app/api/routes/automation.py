from __future__ import annotations

import os
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_request_db
from app.auth import CurrentUser, get_current_user
from app.schemas import AutomationConnectRequest, AutomationSessionCreate, AutomationSessionRead, AutomationSessionUpdate
from app.services import connect_automation, create_automation_session, ensure_user, get_automation_session, update_automation_session

router = APIRouter(tags=["automation"])

PlatformName = Literal[
    "instagram",
    "facebook",
    "x",
    "reddit",
    "linkedin",
    "tiktok",
    "xiaohongshu",
    "producthunt",
]


class AutomationSmokeRequest(BaseModel):
    platform: PlatformName = "reddit"
    signupMethod: Literal["email", "google"] = "google"
    email: str | None = None
    username: str = "vireltest"
    password: str | None = None
    displayName: str = Field(default="Virel Test Project", alias="displayName")
    bio: str | None = "Testing Virel's guided setup assistant."
    holdMs: int = 300_000


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


@router.post("/automation/test-setup")
def start_automation_smoke_test(payload: AutomationSmokeRequest) -> dict[str, int | str]:
    repo_root = Path(__file__).resolve().parents[4]
    automation_dir = repo_root / "automation"

    if not automation_dir.exists():
        raise HTTPException(status_code=500, detail="Automation directory was not found.")

    command = [
        "npm.cmd" if os.name == "nt" else "npm",
        "run",
        "smoke",
        "--",
        payload.model_dump_json(by_alias=True),
    ]

    env = os.environ.copy()
    env.setdefault("HEADLESS", "false")
    env.setdefault("SLOW_MO_MS", "150")

    logs_dir = automation_dir / "logs"
    logs_dir.mkdir(exist_ok=True)
    log_path = logs_dir / f"smoke-{datetime.now().strftime('%Y%m%d-%H%M%S')}.log"

    try:
        log_file = log_path.open("w", encoding="utf-8")
        process = subprocess.Popen(
            command,
            cwd=automation_dir,
            env=env,
            stdout=log_file,
            stderr=subprocess.STDOUT,
            stdin=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0,
        )
        log_file.close()
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Failed to start automation: {exc}") from exc

    return {
        "status": "started",
        "pid": process.pid,
        "platform": payload.platform,
        "logPath": str(log_path),
        "message": "A headed browser should open shortly. Complete verification manually if the platform asks.",
    }

