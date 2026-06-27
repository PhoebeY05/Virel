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
from app.services import (
    connect_automation,
    create_automation_session,
    ensure_user,
    get_automation_session,
    list_automation_sessions,
    update_automation_session,
)

router = APIRouter(tags=["automation"])

PlatformName = Literal[
    "instagram",
    "facebook",
    "x",
    "reddit",
    "linkedin",
    "tiktok",
    "telegram",
    "xiaohongshu",
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


class AutomationSmokeBatchRequest(BaseModel):
    runs: list[AutomationSmokeRequest] = Field(default_factory=list)


class AutomationResumeRequest(BaseModel):
    project_id: str
    platform: PlatformName


def resolve_automation_dir() -> Path | None:
    override = os.environ.get("VIREL_AUTOMATION_DIR")
    if override:
        candidate = Path(override).expanduser().resolve()
        if candidate.exists():
            return candidate

    route_path = Path(__file__).resolve()
    for parent in route_path.parents:
        candidate = parent / "automation"
        if candidate.exists():
            return candidate

    cwd = Path.cwd().resolve()
    for parent in [cwd, *cwd.parents]:
        candidate = parent / "automation"
        if candidate.exists():
            return candidate

    return None


def _spawn_automation_run(
    automation_dir: Path,
    command_name: str,
    payload_json: str,
    *,
    log_prefix: str,
) -> tuple[subprocess.Popen[str], Path]:
    command = [
        "npm.cmd" if os.name == "nt" else "npm",
        "run",
        command_name,
        "--",
        payload_json,
    ]

    env = os.environ.copy()
    env.setdefault("HEADLESS", "false")
    env.setdefault("SLOW_MO_MS", "150")

    if os.name != "nt" and not env.get("DISPLAY"):
        command = [
            "xvfb-run",
            "-a",
            "--server-args=-screen 0 1280x900x24",
            *command,
        ]

    logs_dir = automation_dir / "logs"
    logs_dir.mkdir(parents=True, exist_ok=True)
    log_path = logs_dir / f"{log_prefix}-{datetime.now().strftime('%Y%m%d-%H%M%S')}.log"

    try:
        with log_path.open("w", encoding="utf-8") as log_file:
            process = subprocess.Popen(
                command,
                cwd=automation_dir,
                env=env,
                stdout=log_file,
                stderr=subprocess.STDOUT,
                stdin=subprocess.DEVNULL,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0,
            )
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Failed to start automation: {exc}") from exc

    return process, log_path


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


@router.get("/automation/sessions", response_model=list[AutomationSessionRead])
def get_automation_sessions(
    db: Session = Depends(get_request_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> list[AutomationSessionRead]:
    user = ensure_user(db, current_user)
    return list_automation_sessions(db, user.id)


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
    automation_dir = resolve_automation_dir()
    if automation_dir is None:
        raise HTTPException(
            status_code=500,
            detail="Automation directory was not found. Set VIREL_AUTOMATION_DIR to the local automation folder if the backend is running elsewhere.",
        )

    process, log_path = _spawn_automation_run(
        automation_dir,
        "smoke",
        payload.model_dump_json(by_alias=True),
        log_prefix="smoke",
    )

    return {
        "status": "started",
        "pid": process.pid,
        "platform": payload.platform,
        "logPath": str(log_path),
        "message": "A headed browser should open shortly. Complete verification manually if the platform asks.",
    }


@router.post("/automation/test-setup/batch")
def start_automation_smoke_batch(payload: AutomationSmokeBatchRequest) -> dict[str, object]:
    automation_dir = resolve_automation_dir()
    if automation_dir is None:
        raise HTTPException(
            status_code=500,
            detail="Automation directory was not found. Set VIREL_AUTOMATION_DIR to the local automation folder if the backend is running elsewhere.",
        )

    if not payload.runs:
        raise HTTPException(status_code=422, detail="At least one platform run is required.")

    process, log_path = _spawn_automation_run(
        automation_dir,
        "smoke-batch",
        payload.model_dump_json(by_alias=True),
        log_prefix="smoke-batch",
    )

    return {
        "status": "started",
        "pid": process.pid,
        "platforms": [run.platform for run in payload.runs],
        "count": len(payload.runs),
        "logPath": str(log_path),
        "message": "A headed browser will open each selected platform in sequence. Complete verification manually in the browser.",
    }


@router.post("/automation/resume-session")
def start_automation_resume_session(payload: AutomationResumeRequest) -> dict[str, int | str]:
    automation_dir = resolve_automation_dir()
    if automation_dir is None:
        raise HTTPException(
            status_code=500,
            detail="Automation directory was not found. Set VIREL_AUTOMATION_DIR to the local automation folder if the backend is running elsewhere.",
        )

    process, log_path = _spawn_automation_run(
        automation_dir,
        "resume-from-backend",
        payload.model_dump_json(by_alias=True),
        log_prefix="resume-session",
    )

    return {
        "status": "started",
        "pid": process.pid,
        "platform": payload.platform,
        "logPath": str(log_path),
        "message": "A headed browser will open using the saved session if one exists. Complete verification manually if prompted.",
    }
