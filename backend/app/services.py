from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from statistics import mean

from sqlalchemy import func, select
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
)
from app.platforms import SUPPORTED_PLATFORM_MAP, SUPPORTED_PLATFORMS, platform_names
from app.schemas import (
    AnalyticsDetail,
    AnalyticsPoint,
    AnalyticsSummary,
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
    PostUpdate,
    ProjectCreate,
    ProjectRead,
    ProjectUpdate,
    ReplySuggestionRead,
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

    campaign = Campaign(
        project_id=project.id,
        title=payload.title or plan.title,
        summary=plan.summary,
        goal=payload.goal,
        tone=payload.tone,
        platforms=selected_platforms,
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


def _score_seed(*parts: str) -> int:
    digest = sha256("::".join(parts).encode("utf-8")).hexdigest()
    return int(digest[:12], 16)


def _mock_platform_metrics(seed: int, scale: int = 1) -> dict[str, int | float]:
    likes = 30 + seed % 170 + scale * 3
    comments = 4 + (seed // 7) % 35
    shares = 2 + (seed // 11) % 20
    clicks = 12 + (seed // 13) % 120
    ctr = round(min(0.2, 0.015 + (seed % 25) / 2000), 4)
    return {"likes": likes, "comments": comments, "shares": shares, "clicks": clicks, "ctr": ctr}


def _timeline_for_seed(seed: int) -> list[AnalyticsPoint]:
    points: list[AnalyticsPoint] = []
    base = datetime.now(timezone.utc)
    for offset in range(7):
        daily_seed = seed + offset * 31
        metrics = _mock_platform_metrics(daily_seed)
        points.append(
            AnalyticsPoint(
                date=base.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=offset),
                likes=int(metrics["likes"]),
                comments=int(metrics["comments"]),
                shares=int(metrics["shares"]),
                ctr=float(metrics["ctr"]),
                clicks=int(metrics["clicks"]),
            )
        )
    return points


def _aggregate_platform_summary(items: list[tuple[str, int]]) -> tuple[str, list[AnalyticsPoint], dict[str, dict[str, int | float]]]:
    if not items:
        return "n/a", [], {}
    platform_metrics: dict[str, dict[str, int | float]] = {}
    for platform, seed in items:
        platform_metrics[platform] = _mock_platform_metrics(seed)
    best_platform = max(platform_metrics.items(), key=lambda pair: pair[1]["likes"] + pair[1]["clicks"])[0]
    timeline_seed = sum(seed for _, seed in items) or 1
    return best_platform, _timeline_for_seed(timeline_seed), platform_metrics


def summarize_campaign(session: Session, campaign_id: str, user_id: str) -> AnalyticsDetail:
    campaign = ensure_campaign(session, campaign_id, user_id)
    platform_items = [
        (post.platform, _score_seed(campaign.id, post.id, post.platform))
        for day in campaign.days
        for post in day.posts
    ]
    best_platform, timeline, platform_metrics = _aggregate_platform_summary(platform_items)
    likes = sum(int(metrics["likes"]) for metrics in platform_metrics.values())
    comments = sum(int(metrics["comments"]) for metrics in platform_metrics.values())
    shares = sum(int(metrics["shares"]) for metrics in platform_metrics.values())
    clicks = sum(int(metrics["clicks"]) for metrics in platform_metrics.values())
    ctr = round(mean([float(metrics["ctr"]) for metrics in platform_metrics.values()]) if platform_metrics else 0.0, 4)
    return AnalyticsDetail(
        project_id=campaign.project_id,
        campaign_id=campaign.id,
        likes=likes,
        comments=comments,
        shares=shares,
        ctr=ctr,
        clicks=clicks,
        best_platform=best_platform,
        engagement_timeline=timeline,
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
    platform_items = []
    for campaign in campaigns:
        for day in campaign.days:
            for post in day.posts:
                platform_items.append((post.platform, _score_seed(project.id, campaign.id, post.id, post.platform)))
    best_platform, timeline, platform_metrics = _aggregate_platform_summary(platform_items)
    likes = sum(int(metrics["likes"]) for metrics in platform_metrics.values())
    comments = sum(int(metrics["comments"]) for metrics in platform_metrics.values())
    shares = sum(int(metrics["shares"]) for metrics in platform_metrics.values())
    clicks = sum(int(metrics["clicks"]) for metrics in platform_metrics.values())
    ctr = round(mean([float(metrics["ctr"]) for metrics in platform_metrics.values()]) if platform_metrics else 0.0, 4)
    return AnalyticsDetail(
        project_id=project.id,
        campaign_id=None,
        likes=likes,
        comments=comments,
        shares=shares,
        ctr=ctr,
        clicks=clicks,
        best_platform=best_platform,
        engagement_timeline=timeline,
    )


def summarize_all(session: Session, user_id: str) -> AnalyticsDetail:
    campaigns = list(
        session.scalars(
            select(Campaign)
            .join(Campaign.project)
            .options(selectinload(Campaign.days).selectinload(CampaignDay.posts))
            .where(Project.user_id == user_id)
        )
    )
    platform_items = []
    for campaign in campaigns:
        for day in campaign.days:
            for post in day.posts:
                platform_items.append((post.platform, _score_seed(campaign.id, post.id, post.platform)))
    best_platform, timeline, platform_metrics = _aggregate_platform_summary(platform_items)
    likes = sum(int(metrics["likes"]) for metrics in platform_metrics.values())
    comments = sum(int(metrics["comments"]) for metrics in platform_metrics.values())
    shares = sum(int(metrics["shares"]) for metrics in platform_metrics.values())
    clicks = sum(int(metrics["clicks"]) for metrics in platform_metrics.values())
    ctr = round(mean([float(metrics["ctr"]) for metrics in platform_metrics.values()]) if platform_metrics else 0.0, 4)
    return AnalyticsDetail(
        project_id=None,
        campaign_id=None,
        likes=likes,
        comments=comments,
        shares=shares,
        ctr=ctr,
        clicks=clicks,
        best_platform=best_platform,
        engagement_timeline=timeline,
    )


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
