from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_request_db, get_request_settings
from app.auth import CurrentUser, get_current_user
from app.config import Settings
from app.schemas import AnalyticsDetail, PlatformStatsRead
from app.services import ensure_user, list_platform_stats, summarize_all, summarize_campaign, summarize_project

router = APIRouter(tags=["analytics"])


@router.get("/analytics/summary", response_model=AnalyticsDetail)
def get_analytics_summary(
    db: Session = Depends(get_request_db),
    settings: Settings = Depends(get_request_settings),
    current_user: CurrentUser = Depends(get_current_user),
) -> AnalyticsDetail:
    user = ensure_user(db, current_user)
    return summarize_all(db, settings, user.id)


@router.get("/analytics", response_model=AnalyticsDetail)
def get_analytics(
    db: Session = Depends(get_request_db),
    settings: Settings = Depends(get_request_settings),
    current_user: CurrentUser = Depends(get_current_user),
) -> AnalyticsDetail:
    user = ensure_user(db, current_user)
    return summarize_all(db, settings, user.id)


@router.get("/analytics/projects/{project_id}", response_model=AnalyticsDetail)
def get_project_analytics(
    project_id: str,
    db: Session = Depends(get_request_db),
    settings: Settings = Depends(get_request_settings),
    current_user: CurrentUser = Depends(get_current_user),
) -> AnalyticsDetail:
    user = ensure_user(db, current_user)
    return summarize_project(db, settings, project_id, user.id)


@router.get("/analytics/campaigns/{campaign_id}", response_model=AnalyticsDetail)
def get_campaign_analytics(
    campaign_id: str,
    db: Session = Depends(get_request_db),
    settings: Settings = Depends(get_request_settings),
    current_user: CurrentUser = Depends(get_current_user),
) -> AnalyticsDetail:
    user = ensure_user(db, current_user)
    return summarize_campaign(db, settings, campaign_id, user.id)


@router.get("/analytics/platforms", response_model=list[PlatformStatsRead])
def get_platform_analytics(
    db: Session = Depends(get_request_db),
    settings: Settings = Depends(get_request_settings),
    current_user: CurrentUser = Depends(get_current_user),
) -> list[PlatformStatsRead]:
    user = ensure_user(db, current_user)
    return list_platform_stats(db, settings, user.id)
