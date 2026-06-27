from __future__ import annotations

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.api.deps import get_request_db, get_request_settings
from app.auth import CurrentUser, get_current_user
from app.config import Settings
from app.schemas import (
    CampaignDetail,
    CampaignGenerateRequest,
    CampaignRead,
    CampaignUpdate,
    GeneratedPostRead,
    PostUpdate,
)
from app.services import (
    campaign_to_detail,
    create_campaign_from_request,
    delete_campaign,
    ensure_campaign,
    ensure_user,
    list_campaigns,
    list_posts_for_campaign,
    regenerate_post,
    update_campaign,
    update_post,
)

router = APIRouter(tags=["campaigns"])


@router.get("/campaigns", response_model=list[CampaignRead])
def get_campaigns(
    db: Session = Depends(get_request_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> list[CampaignRead]:
    user = ensure_user(db, current_user)
    return list_campaigns(db, user.id)


@router.post("/campaigns/generate", response_model=CampaignDetail, status_code=201)
def generate_campaign(
    payload: CampaignGenerateRequest,
    db: Session = Depends(get_request_db),
    settings: Settings = Depends(get_request_settings),
    current_user: CurrentUser = Depends(get_current_user),
) -> CampaignDetail:
    user = ensure_user(db, current_user)
    return create_campaign_from_request(db, settings, user, payload)


@router.get("/campaigns/{campaign_id}", response_model=CampaignDetail)
def get_campaign(
    campaign_id: str,
    db: Session = Depends(get_request_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> CampaignDetail:
    user = ensure_user(db, current_user)
    campaign = ensure_campaign(db, campaign_id, user.id)
    return campaign_to_detail(campaign)


@router.patch("/campaigns/{campaign_id}", response_model=CampaignDetail)
def patch_campaign(
    campaign_id: str,
    payload: CampaignUpdate,
    db: Session = Depends(get_request_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> CampaignDetail:
    user = ensure_user(db, current_user)
    return update_campaign(db, campaign_id, user.id, payload)


@router.delete("/campaigns/{campaign_id}", status_code=204)
def remove_campaign(
    campaign_id: str,
    db: Session = Depends(get_request_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> Response:
    user = ensure_user(db, current_user)
    delete_campaign(db, campaign_id, user.id)
    return Response(status_code=204)


@router.get("/campaigns/{campaign_id}/posts", response_model=list[GeneratedPostRead])
def get_campaign_posts(
    campaign_id: str,
    db: Session = Depends(get_request_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> list[GeneratedPostRead]:
    user = ensure_user(db, current_user)
    return list_posts_for_campaign(db, campaign_id, user.id)


@router.patch("/posts/{post_id}", response_model=GeneratedPostRead)
def patch_post(
    post_id: str,
    payload: PostUpdate,
    db: Session = Depends(get_request_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> GeneratedPostRead:
    user = ensure_user(db, current_user)
    return update_post(db, post_id, user.id, payload)


@router.post("/posts/{post_id}/regenerate", response_model=GeneratedPostRead)
def regenerate_generated_post(
    post_id: str,
    db: Session = Depends(get_request_db),
    settings: Settings = Depends(get_request_settings),
    current_user: CurrentUser = Depends(get_current_user),
) -> GeneratedPostRead:
    user = ensure_user(db, current_user)
    return regenerate_post(db, settings, post_id, user.id)

