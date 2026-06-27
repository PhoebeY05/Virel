from __future__ import annotations

from collections.abc import Generator

from fastapi import Request
from sqlalchemy.orm import Session

from app.config import Settings
from app.database import get_db as db_generator


def get_request_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_request_db(request: Request) -> Generator[Session, None, None]:
    session_factory = request.app.state.SessionLocal
    yield from db_generator(session_factory)

