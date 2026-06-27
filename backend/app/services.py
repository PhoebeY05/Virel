from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from hashlib import sha256
import re
from statistics import mean
from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.ai.generator import generate_campaign_plan, generate_reply, validate_plan
from app.auth import CurrentUser
from app.config import Settings
from app.errors import AppError
from app.models import (
    AnalyticsSnapshot,
    AutomationSession,
    Campaign,
    CampaignDay,
    Comment,
    GeneratedPost,
    PlatformAccount,
    Project,
    SuggestedReply,
    User,
    UserSettings,
)
from app.platforms import SUPPORTED_PLATFORM_MAP, SUPPORTED_PLATFORMS, platform_names
from app.schemas import (
    AnalyticsDetail,
    AnalyticsPoint,
    AutomationConnectRequest,
    AutomationSessionCreate,
    AutomationSessionUpdate,
    CampaignDetail,
    CampaignGenerateRequest,
    CampaignRead,
    CampaignUpdate,
    CommentRead,
    GeneratedPostRead,
    PlatformAccountCreate,
    PlatformAccountRead,
    PlatformAccountUpdate,
    PlatformStatsRead,
    PostUpdate,
    ProjectCreate,
    ProjectRead,
    ProjectUpdate,
    ReplySuggestionRead,
    TopPostStatsRead,
    UserSettingsRead,
    UserSettingsUpdate,
)


def ensure_user(session: Session, current_user: CurrentUser) -> User:
    user = session.scalar(select(User).where(User.email == current_user.email))
    if user:
        user.name = current_user.name
        user.auth_provider = current_user.auth_provider
    else:
        user = User(
            id=current_user.id,
            email=current_user.email,
            name=current_user.name,
            auth_provider=current_user.auth_provider,
        )
        session.add(user)
    session.flush()
    return user


def _slugify_handle(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")
    return slug or "virel"


def _platform_username(project_name: str, platform: str) -> str:
    slug = _slugify_handle(project_name)
    if platform == "reddit":
        return f"u/{slug}"
    if platform == "hacker_news":
        return slug
    return f"@{slug}"


def _default_user_settings(user: User) -> dict[str, object]:
    slug = _slugify_handle(user.name)
    branded_handle = f"@{slug}"
    return {
        "company_name": user.name,
        "legal_entity_name": user.name,
        "company_start_date": "",
        "website_url": "",
        "support_email": user.email,
        "phone_number": "",
        "country": "",
        "timezone": "",
        "display_name": user.name,
        "brand_handle": branded_handle,
        "brand_bio": "",
        "profile_image_url": None,
        "backup_email": user.email,
        "google_account_email": user.email,
        "google_link_status": "Not linked",
        "linkedin_url": "",
        "instagram_handle": branded_handle,
        "x_handle": branded_handle,
        "tiktok_handle": branded_handle,
        "reddit_username": f"u/{slug}",
        "email_notifications": True,
        "default_tone": "Confident",
        "theme_mode": "System",
    }


def ensure_user_settings(session: Session, user: User) -> UserSettings:
    settings = session.scalar(select(UserSettings).where(UserSettings.user_id == user.id))
    if settings:
        return settings
    settings = UserSettings(user_id=user.id, **_default_user_settings(user))
    session.add(settings)
    session.flush()
    return settings


def update_user_settings(session: Session, user: User, payload: UserSettingsUpdate) -> UserSettings:
    settings = ensure_user_settings(session, user)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(settings, key, value)
    session.flush()
    return settings


def ensure_owned_project(session: Session, project_id: str, user_id: str) -> Project:
    project = session.scalar(select(Project).where(Project.id == project_id, Project.user_id == user_id))
    if not project:
        raise AppError("Project not found", "PROJECT_NOT_FOUND", 404)
    return project


def ensure_campaign(session: Session, campaign_id: str, user_id: str) -> Campaign:
    campaign = session.scalar(
        select(Campaign)
        .join(Campaign.project)
        .options(selectinload(Campaign.days).selectinload(CampaignDay.posts))
        .where(Campaign.id == campaign_id, Project.user_id == user_id)
    )
    if not campaign:
        raise AppError("Campaign not found", "CAMPAIGN_NOT_FOUND", 404)
    return campaign


def ensure_post(session: Session, post_id: str, user_id: str) -> GeneratedPost:
    post = session.scalar(
        select(GeneratedPost)
        .join(GeneratedPost.campaign)
        .join(Campaign.project)
        .options(selectinload(GeneratedPost.campaign_day), selectinload(GeneratedPost.comments))
        .where(GeneratedPost.id == post_id, Project.user_id == user_id)
    )
    if not post:
        raise AppError("Post not found", "POST_NOT_FOUND", 404)
    return post


def ensure_comment(session: Session, comment_id: str, user_id: str) -> Comment:
    comment = session.scalar(
        select(Comment)
        .join(Comment.post)
        .join(GeneratedPost.campaign)
        .join(Campaign.project)
        .options(selectinload(Comment.post))
        .where(Comment.id == comment_id, Project.user_id == user_id)
    )
    if not comment:
        raise AppError("Comment not found", "COMMENT_NOT_FOUND", 404)
    return comment


def load_project(session: Session, project_id: str, user_id: str) -> Project:
    project = ensure_owned_project(session, project_id, user_id)
    return project


def list_projects(session: Session, user_id: str) -> list[Project]:
    return list(session.scalars(select(Project).where(Project.user_id == user_id).order_by(Project.created_at.desc())))


def create_project(session: Session, user: User, payload: ProjectCreate) -> Project:
    project = Project(user_id=user.id, **payload.model_dump())
    session.add(project)
    session.flush()
    return project


def update_project(session: Session, project_id: str, user_id: str, payload: ProjectUpdate) -> Project:
    project = ensure_owned_project(session, project_id, user_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(project, key, value)
    session.flush()
    return project


def delete_project(session: Session, project_id: str, user_id: str) -> None:
    project = ensure_owned_project(session, project_id, user_id)
    session.delete(project)
    session.flush()


def list_campaigns(session: Session, user_id: str) -> list[Campaign]:
    campaigns = session.scalars(
        select(Campaign)
        .join(Campaign.project)
        .options(selectinload(Campaign.days).selectinload(CampaignDay.posts))
        .where(Project.user_id == user_id)
        .order_by(Campaign.created_at.desc())
    )
    return list(campaigns)


def _load_campaign(session: Session, campaign_id: str, user_id: str) -> Campaign:
    return ensure_campaign(session, campaign_id, user_id)


def campaign_to_detail(campaign: Campaign) -> CampaignDetail:
    data = CampaignRead.model_validate(campaign).model_dump()
    posts = [post for day in campaign.days for post in day.posts]
    data["posts"] = [GeneratedPostRead.model_validate(post).model_dump() for post in posts]
    return CampaignDetail.model_validate(data)


def _campaign_launch_signature(project_id: str, plan: Any) -> str:
    plan_data = plan.model_dump(mode="json")
    normalized_days: list[dict[str, object]] = []
    for day in plan_data.get("days", []):
        normalized_day = dict(day)
        normalized_posts = []
        for post in normalized_day.get("posts", []):
            normalized_post = dict(post)
            normalized_post.pop("scheduled_at", None)
            normalized_posts.append(normalized_post)
        normalized_day["posts"] = normalized_posts
        normalized_days.append(normalized_day)
    payload = {
        "project_id": project_id,
        "title": plan_data.get("title", ""),
        "summary": plan_data.get("summary", ""),
        "tone": plan_data.get("tone", ""),
        "days": normalized_days,
    }
    signature_source = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    return sha256(signature_source.encode("utf-8")).hexdigest()


def create_campaign_from_request(
    session: Session,
    settings: Settings,
    user: User,
    payload: CampaignGenerateRequest,
) -> CampaignDetail:
    project = ensure_owned_project(session, payload.project_id, user.id)
    selected_platforms = list(dict.fromkeys(payload.platforms))
    unsupported = [platform for platform in selected_platforms if platform not in platform_names()]
    if unsupported:
        raise AppError(
            f"Unsupported platform(s): {', '.join(unsupported)}",
            "PLATFORM_NOT_SUPPORTED",
            400,
        )

    plan = generate_campaign_plan(
        project_name=project.name,
        description=project.description,
        audience=project.target_audience,
        goal=payload.goal,
        platforms=selected_platforms,
        tone=payload.tone,
        openai_api_key=settings.openai_api_key,
        model=settings.openai_model,
    )
    validate_plan(plan)
    launch_signature = _campaign_launch_signature(project.id, plan)
    duplicate_campaign = session.scalar(
        select(Campaign.id).where(Campaign.project_id == project.id, Campaign.launch_signature == launch_signature)
    )
    if duplicate_campaign:
        raise AppError(
            "An identical campaign has already been launched for this project.",
            "CAMPAIGN_DUPLICATE",
            409,
        )

    campaign = Campaign(
        project_id=project.id,
        title=payload.title or plan.title,
        summary=plan.summary,
        goal=payload.goal,
        tone=payload.tone,
        platforms=selected_platforms,
        launch_signature=launch_signature,
        status="draft",
    )
    session.add(campaign)
    session.flush()

    for day_plan in plan.days:
        day = CampaignDay(
            campaign_id=campaign.id,
            day_number=day_plan.day_number,
            theme=day_plan.theme,
            objective=day_plan.objective,
        )
        session.add(day)
        session.flush()
        for post_plan in day_plan.posts:
            if post_plan.platform not in selected_platforms:
                continue
            post = GeneratedPost(
                campaign_id=campaign.id,
                campaign_day_id=day.id,
                platform=post_plan.platform,
                day_number=day_plan.day_number,
                title=post_plan.title,
                content=post_plan.content,
                hashtags=post_plan.hashtags,
                call_to_action=post_plan.call_to_action,
                scheduled_at=post_plan.scheduled_at,
                status="scheduled",
            )
            session.add(post)

    session.flush()
    session.expire(campaign, ["days"])
    return campaign_to_detail(_load_campaign(session, campaign.id, user.id))


def update_campaign(session: Session, campaign_id: str, user_id: str, payload: CampaignUpdate) -> CampaignDetail:
    campaign = ensure_campaign(session, campaign_id, user_id)
    updates = payload.model_dump(exclude_unset=True)
    platforms = updates.pop("platforms", None)
    for key, value in updates.items():
        setattr(campaign, key, value)
    if platforms is not None:
        selected_platforms = list(dict.fromkeys(platforms))
        unsupported = [platform for platform in selected_platforms if platform not in platform_names()]
        if unsupported:
            raise AppError(
                f"Unsupported platform(s): {', '.join(unsupported)}",
                "PLATFORM_NOT_SUPPORTED",
                400,
            )
        campaign.platforms = selected_platforms
    session.flush()
    return campaign_to_detail(_load_campaign(session, campaign_id, user_id))


def delete_campaign(session: Session, campaign_id: str, user_id: str) -> None:
    campaign = ensure_campaign(session, campaign_id, user_id)
    session.delete(campaign)
    session.flush()


def list_posts_for_campaign(session: Session, campaign_id: str, user_id: str) -> list[GeneratedPost]:
    campaign = ensure_campaign(session, campaign_id, user_id)
    posts: list[GeneratedPost] = []
    for day in campaign.days:
        posts.extend(day.posts)
    return sorted(posts, key=lambda post: (post.day_number, post.platform, post.scheduled_at or datetime.now(timezone.utc)))


def update_post(session: Session, post_id: str, user_id: str, payload: PostUpdate) -> GeneratedPost:
    post = ensure_post(session, post_id, user_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(post, key, value)
    session.flush()
    return post


def regenerate_post(session: Session, settings: Settings, post_id: str, user_id: str) -> GeneratedPost:
    post = ensure_post(session, post_id, user_id)
    campaign = post.campaign
    project = campaign.project
    plan = generate_campaign_plan(
        project_name=project.name,
        description=project.description,
        audience=project.target_audience,
        goal=campaign.goal,
        platforms=[post.platform],
        tone=campaign.tone,
        openai_api_key=settings.openai_api_key,
        model=settings.openai_model,
    )
    validate_plan(plan)
    day_plan = next((day for day in plan.days if day.day_number == post.day_number), plan.days[0])
    generated = day_plan.posts[0]
    post.title = generated.title
    post.content = generated.content
    post.hashtags = generated.hashtags
    post.call_to_action = generated.call_to_action
    post.scheduled_at = generated.scheduled_at
    post.status = "scheduled"
    session.flush()
    return post


def list_platform_accounts(session: Session, project_id: str, user_id: str) -> list[PlatformAccount]:
    ensure_owned_project(session, project_id, user_id)
    return list(session.scalars(select(PlatformAccount).where(PlatformAccount.project_id == project_id)))


def create_platform_account(
    session: Session,
    project_id: str,
    user_id: str,
    payload: PlatformAccountCreate,
) -> PlatformAccount:
    ensure_owned_project(session, project_id, user_id)
    account = PlatformAccount(project_id=project_id, **payload.model_dump())
    session.add(account)
    session.flush()
    return account


def update_platform_account(session: Session, account_id: str, user_id: str, payload: PlatformAccountUpdate) -> PlatformAccount:
    account = session.scalar(
        select(PlatformAccount)
        .join(PlatformAccount.project)
        .where(PlatformAccount.id == account_id, Project.user_id == user_id)
    )
    if not account:
        raise AppError("Platform account not found", "PLATFORM_ACCOUNT_NOT_FOUND", 404)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(account, key, value)
    session.flush()
    return account


def delete_platform_account(session: Session, account_id: str, user_id: str) -> None:
    account = session.scalar(
        select(PlatformAccount)
        .join(PlatformAccount.project)
        .where(PlatformAccount.id == account_id, Project.user_id == user_id)
    )
    if not account:
        raise AppError("Platform account not found", "PLATFORM_ACCOUNT_NOT_FOUND", 404)
    session.delete(account)
    session.flush()


def create_automation_session(
    session: Session,
    user_id: str,
    payload: AutomationSessionCreate,
) -> AutomationSession:
    ensure_owned_project(session, payload.project_id, user_id)
    automation = AutomationSession(**payload.model_dump())
    session.add(automation)
    session.flush()
    return automation


def connect_automation(
    session: Session,
    user_id: str,
    payload: AutomationConnectRequest,
) -> AutomationSession:
    project = ensure_owned_project(session, payload.project_id, user_id)
    user = session.scalar(select(User).where(User.id == user_id))
    if not user:
        raise AppError("User not found", "USER_NOT_FOUND", 404)
    user_settings = ensure_user_settings(session, user)
    merged_payload = dict(payload.payload)
    defaults = {
        "username": _platform_username(project.name, payload.platform),
        "display_name": user_settings.display_name or project.name,
        "bio": user_settings.brand_bio or project.description,
        "profile_image_url": user_settings.profile_image_url or project.logo_url,
        "account_url": user_settings.website_url or project.demo_url,
        "company_name": user_settings.company_name or project.name,
        "legal_entity_name": user_settings.legal_entity_name or project.name,
        "company_start_date": user_settings.company_start_date,
        "website_url": user_settings.website_url or project.demo_url,
        "support_email": user_settings.support_email,
        "phone_number": user_settings.phone_number,
        "country": user_settings.country,
        "timezone": user_settings.timezone,
        "backup_email": user_settings.backup_email,
        "google_account_email": user_settings.google_account_email,
        "google_link_status": user_settings.google_link_status,
        "brand_handle": user_settings.brand_handle,
        "brand_bio": user_settings.brand_bio or project.description,
        "linkedin_url": user_settings.linkedin_url,
        "instagram_handle": user_settings.instagram_handle,
        "x_handle": user_settings.x_handle,
        "tiktok_handle": user_settings.tiktok_handle,
        "reddit_username": user_settings.reddit_username,
        "project_name": project.name,
        "project_description": project.description,
        "project_goal": project.goal,
        "project_target_audience": project.target_audience,
    }
    for key, value in defaults.items():
        if key not in merged_payload or merged_payload[key] in (None, ""):
            merged_payload[key] = value
    automation = AutomationSession(
        project_id=payload.project_id,
        platform=payload.platform,
        status=payload.status,
        step=payload.step,
        progress=payload.progress,
        payload=merged_payload,
    )
    session.add(automation)
    session.flush()
    return automation


def update_automation_session(session: Session, session_id: str, user_id: str, payload: AutomationSessionUpdate) -> AutomationSession:
    automation = session.scalar(
        select(AutomationSession)
        .join(AutomationSession.project)
        .where(AutomationSession.id == session_id, Project.user_id == user_id)
    )
    if not automation:
        raise AppError("Automation session not found", "AUTOMATION_SESSION_NOT_FOUND", 404)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(automation, key, value)
    session.flush()
    return automation


def get_automation_session(session: Session, session_id: str, user_id: str) -> AutomationSession:
    automation = session.scalar(
        select(AutomationSession)
        .join(AutomationSession.project)
        .where(AutomationSession.id == session_id, Project.user_id == user_id)
    )
    if not automation:
        raise AppError("Automation session not found", "AUTOMATION_SESSION_NOT_FOUND", 404)
    return automation


def list_automation_sessions(session: Session, user_id: str) -> list[AutomationSession]:
    return list(
        session.scalars(
            select(AutomationSession)
            .join(AutomationSession.project)
            .where(Project.user_id == user_id)
            .order_by(AutomationSession.created_at.desc())
        )
    )


def list_comments_for_post(session: Session, post_id: str, user_id: str) -> list[Comment]:
    ensure_post(session, post_id, user_id)
    return list(session.scalars(select(Comment).where(Comment.post_id == post_id).order_by(Comment.created_at.asc())))


def suggest_reply(
    session: Session,
    settings: Settings,
    comment_id: str,
    user_id: str,
    tone: str,
) -> SuggestedReply:
    comment = ensure_comment(session, comment_id, user_id)
    post = comment.post
    campaign = post.campaign
    project = campaign.project
    reply = generate_reply(
        project_description=project.description,
        post_content=post.content,
        comment=comment.content,
        tone=tone,
        platform=post.platform,
        openai_api_key=settings.openai_api_key,
        model=settings.openai_model,
    )
    suggestion = SuggestedReply(
        comment_id=comment.id,
        reply_text=reply.reply_text,
        tone=tone,
        platform=post.platform,
        status="draft",
    )
    session.add(suggestion)
    session.flush()
    return suggestion


def send_reply(
    session: Session,
    settings: Settings,
    comment_id: str,
    user_id: str,
    tone: str,
) -> SuggestedReply:
    suggestion = suggest_reply(session, settings, comment_id, user_id, tone)
    suggestion.status = "sent"
    session.flush()
    return suggestion


def _list_user_analytics_snapshots(session: Session, user_id: str) -> list[AnalyticsSnapshot]:
    project_ids = list(session.scalars(select(Project.id).where(Project.user_id == user_id)))
    campaign_ids = list(
        session.scalars(select(Campaign.id).join(Campaign.project).where(Project.user_id == user_id))
    )

    filters = []
    if project_ids:
        filters.append(AnalyticsSnapshot.project_id.in_(project_ids))
    if campaign_ids:
        filters.append(AnalyticsSnapshot.campaign_id.in_(campaign_ids))

    if not filters:
        return []

    return list(
        session.scalars(
            select(AnalyticsSnapshot).where(or_(*filters)).order_by(AnalyticsSnapshot.snapshot_date.asc())
        )
    )


def _aggregate_snapshot_summary(
    snapshots: list[AnalyticsSnapshot],
) -> tuple[str, list[AnalyticsPoint], list[PlatformStatsRead], list[TopPostStatsRead]]:
    if not snapshots:
        return "n/a", [], [], []

    platform_metrics: dict[str, dict[str, float | int]] = defaultdict(
        lambda: {"likes": 0, "comments": 0, "shares": 0, "clicks": 0, "ctr_total": 0.0, "posts": 0}
    )

    for snapshot in snapshots:
        platform_entry = platform_metrics[snapshot.platform]
        platform_entry["likes"] = int(platform_entry["likes"]) + int(snapshot.likes)
        platform_entry["comments"] = int(platform_entry["comments"]) + int(snapshot.comments)
        platform_entry["shares"] = int(platform_entry["shares"]) + int(snapshot.shares)
        platform_entry["clicks"] = int(platform_entry["clicks"]) + int(snapshot.clicks)
        platform_entry["ctr_total"] = float(platform_entry["ctr_total"]) + float(snapshot.ctr)
        platform_entry["posts"] = int(platform_entry["posts"]) + 1

    best_platform = max(platform_metrics.items(), key=lambda pair: int(pair[1]["likes"]) + int(pair[1]["clicks"]))[0]
    timeline = [
        AnalyticsPoint(
            date=snapshot.snapshot_date,
            likes=snapshot.likes,
            comments=snapshot.comments,
            shares=snapshot.shares,
            ctr=snapshot.ctr,
            clicks=snapshot.clicks,
        )
        for snapshot in snapshots[-7:]
    ]
    platform_stats = [
        PlatformStatsRead(
            platform=platform,
            likes=int(metrics["likes"]),
            comments=int(metrics["comments"]),
            shares=int(metrics["shares"]),
            clicks=int(metrics["clicks"]),
            ctr=round(float(metrics["ctr_total"]) / max(int(metrics["posts"]), 1), 4),
            engagement=int(metrics["likes"]) + int(metrics["comments"]) + int(metrics["shares"]) + int(metrics["clicks"]),
            posts=int(metrics["posts"]),
        )
        for platform, metrics in platform_metrics.items()
    ]
    platform_stats.sort(key=lambda item: (item.engagement, item.clicks), reverse=True)
    return best_platform, timeline, platform_stats, []


def _count_active_campaigns(campaigns: list[Campaign]) -> int:
    return sum(1 for campaign in campaigns if campaign.status.lower() != "complete")


def _build_summary(
    *,
    project_id: str | None,
    campaign_id: str | None,
    total_projects: int,
    active_campaigns: int,
    snapshots: list[AnalyticsSnapshot],
) -> AnalyticsDetail:
    best_platform, timeline, platform_stats, top_posts = _aggregate_snapshot_summary(snapshots)
    likes = sum(item.likes for item in platform_stats)
    comments = sum(item.comments for item in platform_stats)
    shares = sum(item.shares for item in platform_stats)
    clicks = sum(item.clicks for item in platform_stats)
    ctr = round(mean([item.ctr for item in platform_stats]) if platform_stats else 0.0, 4)
    engagement = likes + comments + shares + clicks
    return AnalyticsDetail(
        project_id=project_id,
        campaign_id=campaign_id,
        likes=likes,
        comments=comments,
        shares=shares,
        ctr=ctr,
        clicks=clicks,
        engagement=engagement,
        best_platform=best_platform,
        engagement_timeline=timeline,
        active_campaigns=active_campaigns,
        total_projects=total_projects,
        platforms=platform_stats,
        top_posts=top_posts,
    )


def summarize_campaign(session: Session, campaign_id: str, user_id: str) -> AnalyticsDetail:
    campaign = ensure_campaign(session, campaign_id, user_id)
    snapshots = list(
        session.scalars(
            select(AnalyticsSnapshot)
            .where(AnalyticsSnapshot.campaign_id == campaign.id)
            .order_by(AnalyticsSnapshot.snapshot_date.asc())
        )
    )
    return _build_summary(
        project_id=campaign.project_id,
        campaign_id=campaign.id,
        total_projects=1,
        active_campaigns=1 if campaign.status.lower() != "complete" else 0,
        snapshots=snapshots,
    )


def summarize_project(session: Session, project_id: str, user_id: str) -> AnalyticsDetail:
    project = ensure_owned_project(session, project_id, user_id)
    campaigns = list(
        session.scalars(
            select(Campaign)
            .where(Campaign.project_id == project.id)
            .options(selectinload(Campaign.days).selectinload(CampaignDay.posts))
        )
    )
    snapshots = list(
        session.scalars(
            select(AnalyticsSnapshot)
            .where(AnalyticsSnapshot.project_id == project.id)
            .order_by(AnalyticsSnapshot.snapshot_date.asc())
        )
    )
    return _build_summary(
        project_id=project.id,
        campaign_id=None,
        total_projects=1,
        active_campaigns=_count_active_campaigns(campaigns),
        snapshots=snapshots,
    )


def summarize_all(session: Session, user_id: str) -> AnalyticsDetail:
    projects = list(session.scalars(select(Project).where(Project.user_id == user_id)))
    campaigns = list(
        session.scalars(
            select(Campaign)
            .join(Campaign.project)
            .options(selectinload(Campaign.days).selectinload(CampaignDay.posts))
            .where(Project.user_id == user_id)
        )
    )
    snapshots = _list_user_analytics_snapshots(session, user_id)
    return _build_summary(
        project_id=None,
        campaign_id=None,
        total_projects=len(projects),
        active_campaigns=_count_active_campaigns(campaigns),
        snapshots=snapshots,
    )


def list_platform_stats(session: Session, user_id: str) -> list[PlatformStatsRead]:
    return summarize_all(session, user_id).platforms


def list_supported_platforms() -> list[dict[str, object]]:
    return [
        {
            "name": platform.name,
            "slug": platform.slug,
            "writing_style": platform.writing_style,
            "requires_human_verification": platform.requires_human_verification,
            "phone_required": platform.phone_required,
            "automation_level": platform.automation_level,
            "notes": platform.notes,
        }
        for platform in SUPPORTED_PLATFORMS
    ]
