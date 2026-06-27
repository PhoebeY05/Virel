from __future__ import annotations

from fastapi import APIRouter

from app.schemas import SupportedPlatformRead
from app.services import list_supported_platforms

router = APIRouter(tags=["platforms"])


@router.get("/platforms", response_model=list[SupportedPlatformRead])
def get_platforms() -> list[SupportedPlatformRead]:
    return [SupportedPlatformRead.model_validate(platform) for platform in list_supported_platforms()]

