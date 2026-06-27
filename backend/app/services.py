from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from statistics import mean

from sqlalchemy import select
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


def _empty_analytics(project_id: str | None = None, campaign_id: str | None = None) -> AnalyticsDetail:
    return AnalyticsDetail(
        project_id=project_id,
        campaign_id=campaign_id,
        likes=0,
        comments=0,
        shares=0,
        ctr=0.0,
        clicks=0,
        best_platform="n/a",
        engagement_timeline=[],
    )


def _point_from_mapping(item: dict[str, object], fallback_date: datetime) -> AnalyticsPoint:
    raw_date = item.get("date") or item.get("snapshot_date") or fallback_date
    if isinstance(raw_date, datetime):
        date = raw_date
    else:
        date = datetime.fromisoformat(str(raw_date).replace("Z", "+00:00"))
    return AnalyticsPoint(
        date=date,
        likes=int(item.get("likes") or 0),
        comments=int(item.get("comments") or 0),
        shares=int(item.get("shares") or 0),
        ctr=float(item.get("ctr") or 0.0),
        clicks=int(item.get("clicks") or 0),
    )


def _points_for_snapshot(snapshot: AnalyticsSnapshot) -> list[AnalyticsPoint]:
    if snapshot.timeline:
        return [_point_from_mapping(item, snapshot.snapshot_date) for item in snapshot.timeline]
    return [
        AnalyticsPoint(
            date=snapshot.snapshot_date,
            likes=snapshot.likes,
            comments=snapshot.comments,
            shares=snapshot.shares,
            ctr=snapshot.ctr,
            clicks=snapshot.clicks,
        )
    ]


def _aggregate_snapshots(
    snapshots: list[AnalyticsSnapshot],
    project_id: str | None = None,
    campaign_id: str | None = None,
) -> AnalyticsDetail:
    if not snapshots:
        return _empty_analytics(project_id=project_id, campaign_id=campaign_id)

    platform_totals: dict[str, dict[str, int | float]] = defaultdict(
        lambda: {"likes": 0, "comments": 0, "shares": 0, "clicks": 0, "ctr_values": []}
    )
    timeline_totals: dict[datetime, dict[str, int | list[float]]] = defaultdict(
        lambda: {"likes": 0, "comments": 0, "shares": 0, "clicks": 0, "ctr_values": []}
    )

    for snapshot in snapshots:
        platform_metrics = platform_totals[snapshot.platform]
        platform_metrics["likes"] = int(platform_metrics["likes"]) + snapshot.likes
        platform_metrics["comments"] = int(platform_metrics["comments"]) + snapshot.comments
        platform_metrics["shares"] = int(platform_metrics["shares"]) + snapshot.shares
        platform_metrics["clicks"] = int(platform_metrics["clicks"]) + snapshot.clicks
        platform_metrics["ctr_values"].append(snapshot.ctr)  # type: ignore[union-attr]

        for point in _points_for_snapshot(snapshot):
            date_key = point.date.replace(hour=0, minute=0, second=0, microsecond=0)
            day = timeline_totals[date_key]
            day["likes"] = int(day["likes"]) + point.likes
            day["comments"] = int(day["comments"]) + point.comments
            day["shares"] = int(day["shares"]) + point.shares
            day["clicks"] = int(day["clicks"]) + point.clicks
            day["ctr_values"].append(point.ctr)  # type: ignore[union-attr]

    likes = sum(snapshot.likes for snapshot in snapshots)
    comments = sum(snapshot.comments for snapshot in snapshots)
    shares = sum(snapshot.shares for snapshot in snapshots)
    clicks = sum(snapshot.clicks for snapshot in snapshots)
    ctr = round(mean([snapshot.ctr for snapshot in snapshots]), 4)
    best_platform = max(
        platform_totals.items(),
        key=lambda item: int(item[1]["likes"]) + int(item[1]["clicks"]),
    )[0]
    timeline = [
        AnalyticsPoint(
            date=date,
            likes=int(values["likes"]),
            comments=int(values["comments"]),
            shares=int(values["shares"]),
            clicks=int(values["clicks"]),
            ctr=round(mean(values["ctr_values"]), 4) if values["ctr_values"] else 0.0,  # type: ignore[arg-type]
        )
        for date, values in sorted(timeline_totals.items())
    ]

    return AnalyticsDetail(
        project_id=project_id,
        campaign_id=campaign_id,
        likes=likes,
        comments=comments,
        shares=shares,
        ctr=ctr,
        clicks=clicks,
        best_platform=best_platform,
        engagement_timeline=timeline,
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
    return _aggregate_snapshots(snapshots, project_id=campaign.project_id, campaign_id=campaign.id)


def summarize_project(session: Session, project_id: str, user_id: str) -> AnalyticsDetail:
    project = ensure_owned_project(session, project_id, user_id)
    snapshots = list(
        session.scalars(
            select(AnalyticsSnapshot)
            .where(AnalyticsSnapshot.project_id == project.id)
            .order_by(AnalyticsSnapshot.snapshot_date.asc())
        )
    )
    return _aggregate_snapshots(snapshots, project_id=project.id)


def summarize_all(session: Session, user_id: str) -> AnalyticsDetail:
    snapshots = list(
        session.scalars(
            select(AnalyticsSnapshot)
            .join(AnalyticsSnapshot.project)
            .where(Project.user_id == user_id)
            .order_by(AnalyticsSnapshot.snapshot_date.asc())
        )
    )
    return _aggregate_snapshots(snapshots)


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
