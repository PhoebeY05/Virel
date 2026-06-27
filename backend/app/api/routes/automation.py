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


class AutomationSignupPrefillRequest(BaseModel):
    projectId: str = Field(alias="projectId")
    platform: PlatformName = "reddit"
    signupMethod: Literal["email", "google"] = "email"
    email: str | None = None
    username: str
    password: str | None = None
    displayName: str = Field(alias="displayName")
    bio: str | None = None
    websiteUrl: str | None = Field(default=None, alias="websiteUrl")
    profileImagePath: str | None = Field(default=None, alias="profileImagePath")
    holdMs: int = 300_000


class AutomationPublishPost(BaseModel):
    campaignId: str = Field(alias="campaignId")
    postId: str = Field(alias="postId")
    accountId: str | None = Field(default=None, alias="accountId")
    platform: PlatformName
    text: str
    mediaPaths: list[str] = Field(default_factory=list, alias="mediaPaths")
    linkUrl: str | None = Field(default=None, alias="linkUrl")


class AutomationPublishBatchRequest(BaseModel):
    projectId: str = Field(alias="projectId")
    displayName: str = Field(alias="displayName")
    username: str
    bio: str | None = None
    websiteUrl: str | None = Field(default=None, alias="websiteUrl")
    profileImagePath: str | None = Field(default=None, alias="profileImagePath")
    posts: list[AutomationPublishPost]


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


def _automation_dir() -> Path:
    repo_root = Path(__file__).resolve().parents[4]
    automation_dir = Path(os.environ.get("AUTOMATION_DIR", repo_root / "automation")).resolve()

    if not automation_dir.exists():
        raise HTTPException(status_code=500, detail="Automation directory was not found.")

    return automation_dir


def _start_automation_process(command: list[str], automation_dir: Path, log_prefix: str, failure_label: str) -> tuple[int, Path]:
    env = os.environ.copy()
    env.setdefault("HEADLESS", "false")
    env.setdefault("SLOW_MO_MS", "150")

    logs_dir = automation_dir / "logs"
    logs_dir.mkdir(exist_ok=True)
    log_path = logs_dir / f"{log_prefix}-{datetime.now().strftime('%Y%m%d-%H%M%S')}.log"

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
        raise HTTPException(status_code=500, detail=f"Failed to start {failure_label}: {exc}") from exc

    return process.pid, log_path


@router.post("/automation/prefill-signup")
def start_signup_prefill(payload: AutomationSignupPrefillRequest) -> dict[str, int | str]:
    automation_dir = _automation_dir()

    command = [
        "npm.cmd" if os.name == "nt" else "npm",
        "run",
        "prefill-signup",
        "--",
        payload.model_dump_json(by_alias=True),
    ]

    pid, log_path = _start_automation_process(command, automation_dir, "prefill-signup", "signup prefill")

    return {
        "status": "started",
        "pid": pid,
        "platform": payload.platform,
        "logPath": str(log_path),
        "message": "Signup prefill assistant started. Review the opened form, fill missing verification details, and submit manually.",
    }


@router.post("/automation/publish-batch")
def start_publish_batch(payload: AutomationPublishBatchRequest) -> dict[str, int | str]:
    automation_dir = _automation_dir()

    command = [
        "npm.cmd" if os.name == "nt" else "npm",
        "run",
        "publish-batch",
        "--",
        payload.model_dump_json(by_alias=True),
    ]

    pid, log_path = _start_automation_process(command, automation_dir, "publish", "publishing assistant")

    return {
        "status": "started",
        "pid": pid,
        "logPath": str(log_path),
        "message": "Publishing assistant started. Review each opened composer and publish manually when ready.",
    }

