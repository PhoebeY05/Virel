from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_request_db, get_request_settings
from app.auth import CurrentUser, get_current_user
from app.config import Settings
from app.schemas import CommentRead, ReplySendRequest, ReplySuggestionRead, ReplySuggestionRequest
from app.services import ensure_user, list_comments_for_post, send_reply, suggest_reply

router = APIRouter(tags=["comments"])


@router.get("/posts/{post_id}/comments", response_model=list[CommentRead])
def get_post_comments(
    post_id: str,
    db: Session = Depends(get_request_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> list[CommentRead]:
    user = ensure_user(db, current_user)
    return list_comments_for_post(db, post_id, user.id)


@router.post("/comments/{comment_id}/suggest-reply", response_model=ReplySuggestionRead, status_code=201)
def suggest_comment_reply(
    comment_id: str,
    payload: ReplySuggestionRequest,
    db: Session = Depends(get_request_db),
    settings: Settings = Depends(get_request_settings),
    current_user: CurrentUser = Depends(get_current_user),
) -> ReplySuggestionRead:
    user = ensure_user(db, current_user)
    return suggest_reply(db, settings, comment_id, user.id, payload.tone)


@router.post("/comments/{comment_id}/reply", response_model=ReplySuggestionRead, status_code=201)
def send_comment_reply(
    comment_id: str,
    payload: ReplySendRequest,
    db: Session = Depends(get_request_db),
    settings: Settings = Depends(get_request_settings),
    current_user: CurrentUser = Depends(get_current_user),
) -> ReplySuggestionRead:
    user = ensure_user(db, current_user)
    return send_reply(db, settings, comment_id, user.id, payload.tone)

