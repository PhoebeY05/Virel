from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.ai.generator import generate_campaign_plan, generate_reply, validate_plan
from app.analytics.providers import AccountMetrics, AnalyticsAccount, collect_account_metrics
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


def connect_automation(
    session: Session,
    user_id: str,
    payload: AutomationConnectRequest,
) -> AutomationSession:
    ensure_owned_project(session, payload.project_id, user_id)
    automation = AutomationSession(
        project_id=payload.project_id,
        platform=payload.platform,
        status=payload.status,
        step=payload.step,
        progress=payload.progress,
        payload=payload.payload,
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


def _snapshot_metadata(snapshot: AnalyticsSnapshot) -> dict[str, object]:
    if snapshot.timeline and isinstance(snapshot.timeline[-1], dict):
        return snapshot.timeline[-1]
    return {}


def _metadata_int(snapshot: AnalyticsSnapshot, key: str) -> int:
    value = _snapshot_metadata(snapshot).get(key, 0)
    return int(value) if isinstance(value, (int, float)) else 0


def _latest_snapshots(
    session: Session,
    user_id: str,
    project_id: str | None = None,
) -> list[AnalyticsSnapshot]:
    query = (
        select(AnalyticsSnapshot)
        .join(AnalyticsSnapshot.project)
        .where(Project.user_id == user_id, AnalyticsSnapshot.campaign_id.is_(None))
        .order_by(AnalyticsSnapshot.snapshot_date.desc())
    )
    if project_id:
        query = query.where(AnalyticsSnapshot.project_id == project_id)

    latest: dict[tuple[str | None, str], AnalyticsSnapshot] = {}
    for snapshot in session.scalars(query):
        latest.setdefault((snapshot.project_id, snapshot.platform), snapshot)
    return list(latest.values())


def _snapshots_are_fresh(snapshots: list[AnalyticsSnapshot], ttl_seconds: int) -> bool:
    if not snapshots or ttl_seconds <= 0:
        return False
    now = datetime.now(timezone.utc)
    for snapshot in snapshots:
        captured_at = snapshot.snapshot_date
        if captured_at.tzinfo is None:
            captured_at = captured_at.replace(tzinfo=timezone.utc)
        if (now - captured_at).total_seconds() > ttl_seconds:
            return False
    return True


def _store_account_metrics(session: Session, metrics: AccountMetrics) -> None:
    snapshot = session.scalar(
        select(AnalyticsSnapshot)
        .where(
            AnalyticsSnapshot.project_id == metrics.project_id,
            AnalyticsSnapshot.campaign_id.is_(None),
            AnalyticsSnapshot.platform == metrics.platform,
        )
        .order_by(AnalyticsSnapshot.snapshot_date.desc())
    )
    captured_at = datetime.now(timezone.utc)
    if snapshot is None:
        snapshot = AnalyticsSnapshot(
            project_id=metrics.project_id,
            campaign_id=None,
            platform=metrics.platform,
        )
        session.add(snapshot)
    snapshot.likes = metrics.likes
    snapshot.comments = metrics.comments
    snapshot.shares = metrics.shares
    snapshot.clicks = 0
    snapshot.ctr = 0.0
    snapshot.snapshot_date = captured_at
    snapshot.timeline = [
        {
            "date": captured_at.isoformat(),
            "likes": metrics.likes,
            "comments": metrics.comments,
            "shares": metrics.shares,
            "views": metrics.views,
            "followers": metrics.followers,
            "posts": metrics.posts,
            "source": metrics.source,
        }
    ]


def refresh_account_analytics(
    session: Session,
    settings: Settings,
    user_id: str,
    project_id: str | None = None,
) -> None:
    query = select(PlatformAccount).join(PlatformAccount.project).where(Project.user_id == user_id)
    if project_id:
        query = query.where(PlatformAccount.project_id == project_id)
    accounts = list(session.scalars(query))
    existing = _latest_snapshots(session, user_id, project_id)
    if not accounts or _snapshots_are_fresh(existing, settings.analytics_cache_ttl_seconds):
        return

    provider_accounts = [
        AnalyticsAccount(
            project_id=account.project_id,
            platform=account.platform,
            username=account.username,
            account_url=account.account_url,
        )
        for account in accounts
    ]
    for metrics in collect_account_metrics(settings, provider_accounts):
        _store_account_metrics(session, metrics)
    session.flush()


def _analytics_from_snapshots(
    snapshots: list[AnalyticsSnapshot],
    *,
    project_id: str | None = None,
    campaign_id: str | None = None,
    active_campaigns: int = 0,
    total_projects: int = 0,
) -> AnalyticsDetail:
    grouped: dict[str, dict[str, int]] = {}
    for snapshot in snapshots:
        current = grouped.setdefault(
            snapshot.platform,
            {"likes": 0, "comments": 0, "shares": 0, "views": 0, "followers": 0, "posts": 0},
        )
        current["likes"] += snapshot.likes
        current["comments"] += snapshot.comments
        current["shares"] += snapshot.shares
        current["views"] += _metadata_int(snapshot, "views")
        current["followers"] += _metadata_int(snapshot, "followers")
        current["posts"] += _metadata_int(snapshot, "posts")

    platforms = [
        PlatformStatsRead(
            platform=platform,
            likes=metrics["likes"],
            comments=metrics["comments"],
            shares=metrics["shares"],
            views=metrics["views"],
            followers=metrics["followers"],
            engagement=metrics["likes"] + metrics["comments"] + metrics["shares"],
            posts=metrics["posts"],
        )
        for platform, metrics in grouped.items()
    ]
    platforms.sort(key=lambda item: (item.engagement, item.views, item.followers), reverse=True)
    likes = sum(item.likes for item in platforms)
    comments = sum(item.comments for item in platforms)
    shares = sum(item.shares for item in platforms)
    views = sum(item.views for item in platforms)
    followers = sum(item.followers for item in platforms)
    engagement = likes + comments + shares
    timeline = []
    if snapshots:
        latest_date = max(snapshot.snapshot_date for snapshot in snapshots)
        timeline = [
            AnalyticsPoint(
                date=latest_date,
                likes=likes,
                comments=comments,
                shares=shares,
                views=views,
                followers=followers,
            )
        ]
    return AnalyticsDetail(
        project_id=project_id,
        campaign_id=campaign_id,
        likes=likes,
        comments=comments,
        shares=shares,
        views=views,
        followers=followers,
        engagement=engagement,
        best_platform=platforms[0].platform if platforms else "n/a",
        engagement_timeline=timeline,
        active_campaigns=active_campaigns,
        total_projects=total_projects,
        platforms=platforms,
        top_posts=[],
    )


def _load_campaigns_for_user(session: Session, user_id: str) -> list[Campaign]:
    return list(
        session.scalars(
            select(Campaign)
            .join(Campaign.project)
            .options(selectinload(Campaign.days).selectinload(CampaignDay.posts))
            .where(Project.user_id == user_id)
            .order_by(Campaign.created_at.desc())
        )
    )


def summarize_campaign(
    session: Session,
    settings: Settings,
    campaign_id: str,
    user_id: str,
) -> AnalyticsDetail:
    campaign = ensure_campaign(session, campaign_id, user_id)
    refresh_account_analytics(session, settings, user_id, campaign.project_id)
    total_projects = session.scalar(select(func.count()).select_from(Project).where(Project.user_id == user_id)) or 0
    return _analytics_from_snapshots(
        _latest_snapshots(session, user_id, campaign.project_id),
        project_id=campaign.project_id,
        campaign_id=campaign.id,
        active_campaigns=1 if campaign.status.lower() in {"draft", "scheduled", "live"} else 0,
        total_projects=total_projects,
    )


def summarize_project(
    session: Session,
    settings: Settings,
    project_id: str,
    user_id: str,
) -> AnalyticsDetail:
    project = ensure_owned_project(session, project_id, user_id)
    campaigns = list(
        session.scalars(
            select(Campaign)
            .where(Campaign.project_id == project.id)
            .options(selectinload(Campaign.days).selectinload(CampaignDay.posts))
            .order_by(Campaign.created_at.desc())
        )
    )
    refresh_account_analytics(session, settings, user_id, project.id)
    return _analytics_from_snapshots(
        _latest_snapshots(session, user_id, project.id),
        project_id=project.id,
        active_campaigns=sum(1 for campaign in campaigns if campaign.status.lower() in {"draft", "scheduled", "live"}),
        total_projects=1,
    )


def summarize_all(session: Session, settings: Settings, user_id: str) -> AnalyticsDetail:
    campaigns = _load_campaigns_for_user(session, user_id)
    total_projects = len(list_projects(session, user_id))
    refresh_account_analytics(session, settings, user_id)
    return _analytics_from_snapshots(
        _latest_snapshots(session, user_id),
        active_campaigns=sum(1 for campaign in campaigns if campaign.status.lower() in {"draft", "scheduled", "live"}),
        total_projects=total_projects,
    )


def list_platform_stats(session: Session, settings: Settings, user_id: str) -> list[PlatformStatsRead]:
    return summarize_all(session, settings, user_id).platforms


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
