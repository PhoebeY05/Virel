from __future__ import annotations

from fastapi import APIRouter, Request

from app.api.deps import get_request_settings
from app.schemas import HealthRead

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthRead)
def health(request: Request) -> HealthRead:
    settings = get_request_settings(request)
    return HealthRead(
        status="ok",
        service=settings.app_name,
        auth_enabled=settings.auth_enabled,
        database_url=settings.database_url,
    )

