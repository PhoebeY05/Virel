from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_id() -> str:
    return uuid4().hex


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    auth_provider: Mapped[str] = mapped_column(String(50), default="demo", nullable=False)

    projects: Mapped[list["Project"]] = relationship(back_populates="owner", cascade="all, delete-orphan")
    settings: Mapped["UserSettings"] = relationship(back_populates="user", cascade="all, delete-orphan", uselist=False)


class UserSettings(Base, TimestampMixin):
    __tablename__ = "user_settings"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True, index=True, nullable=False)
    company_name: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    legal_entity_name: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    company_start_date: Mapped[str] = mapped_column(String(32), default="", nullable=False)
    website_url: Mapped[str] = mapped_column(String(1024), default="", nullable=False)
    support_email: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    phone_number: Mapped[str] = mapped_column(String(100), default="", nullable=False)
    country: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    timezone: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    brand_handle: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    brand_bio: Mapped[str] = mapped_column(Text, default="", nullable=False)
    profile_image_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    backup_email: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    google_account_email: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    google_link_status: Mapped[str] = mapped_column(String(50), default="Not linked", nullable=False)
    linkedin_url: Mapped[str] = mapped_column(String(1024), default="", nullable=False)
    instagram_handle: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    x_handle: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    tiktok_handle: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    reddit_username: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    email_notifications: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    default_tone: Mapped[str] = mapped_column(String(100), default="Confident", nullable=False)
    theme_mode: Mapped[str] = mapped_column(String(50), default="System", nullable=False)

    user: Mapped[User] = relationship(back_populates="settings")


class Project(Base, TimestampMixin):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    target_audience: Mapped[str] = mapped_column(Text, default="", nullable=False)
    goal: Mapped[str] = mapped_column(Text, default="", nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="draft", nullable=False)
    repo_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    demo_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)

    owner: Mapped[User] = relationship(back_populates="projects")
    campaigns: Mapped[list["Campaign"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    platform_accounts: Mapped[list["PlatformAccount"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    automation_sessions: Mapped[list["AutomationSession"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    analytics_snapshots: Mapped[list["AnalyticsSnapshot"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )


class Campaign(Base, TimestampMixin):
    __tablename__ = "campaigns"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[str] = mapped_column(Text, default="", nullable=False)
    goal: Mapped[str] = mapped_column(Text, default="", nullable=False)
    tone: Mapped[str] = mapped_column(String(100), default="confident", nullable=False)
    platforms: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    launch_signature: Mapped[str] = mapped_column(String(64), default="", nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(50), default="draft", nullable=False)

    project: Mapped[Project] = relationship(back_populates="campaigns")
    days: Mapped[list["CampaignDay"]] = relationship(
        back_populates="campaign", cascade="all, delete-orphan", order_by="CampaignDay.day_number"
    )
    analytics_snapshots: Mapped[list["AnalyticsSnapshot"]] = relationship(
        back_populates="campaign", cascade="all, delete-orphan"
    )


class CampaignDay(Base, TimestampMixin):
    __tablename__ = "campaign_days"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    campaign_id: Mapped[str] = mapped_column(ForeignKey("campaigns.id"), index=True, nullable=False)
    day_number: Mapped[int] = mapped_column(Integer, nullable=False)
    theme: Mapped[str] = mapped_column(String(255), nullable=False)
    objective: Mapped[str] = mapped_column(Text, default="", nullable=False)

    campaign: Mapped[Campaign] = relationship(back_populates="days")
    posts: Mapped[list["GeneratedPost"]] = relationship(
        back_populates="campaign_day", cascade="all, delete-orphan", order_by="GeneratedPost.scheduled_at"
    )


class GeneratedPost(Base, TimestampMixin):
    __tablename__ = "generated_posts"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    campaign_id: Mapped[str] = mapped_column(ForeignKey("campaigns.id"), index=True, nullable=False)
    campaign_day_id: Mapped[str] = mapped_column(ForeignKey("campaign_days.id"), index=True, nullable=False)
    platform: Mapped[str] = mapped_column(String(100), nullable=False)
    day_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    content: Mapped[str] = mapped_column(Text, default="", nullable=False)
    hashtags: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    call_to_action: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="draft", nullable=False)

    campaign: Mapped[Campaign] = relationship()
    campaign_day: Mapped[CampaignDay] = relationship(back_populates="posts")
    comments: Mapped[list["Comment"]] = relationship(
        back_populates="post", cascade="all, delete-orphan", order_by="Comment.created_at"
    )


class PlatformAccount(Base, TimestampMixin):
    __tablename__ = "platform_accounts"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), index=True, nullable=False)
    platform: Mapped[str] = mapped_column(String(100), nullable=False)
    username: Mapped[str] = mapped_column(String(255), nullable=False)
    bio: Mapped[str] = mapped_column(Text, default="", nullable=False)
    profile_image_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    account_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="planned", nullable=False)
    notes: Mapped[str] = mapped_column(Text, default="", nullable=False)
    phone_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    session_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)

    project: Mapped[Project] = relationship(back_populates="platform_accounts")


class AutomationSession(Base, TimestampMixin):
    __tablename__ = "automation_sessions"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), index=True, nullable=False)
    platform: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="queued", nullable=False)
    step: Mapped[str] = mapped_column(String(255), default="created", nullable=False)
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    project: Mapped[Project] = relationship(back_populates="automation_sessions")


class AnalyticsSnapshot(Base, TimestampMixin):
    __tablename__ = "analytics_snapshots"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    project_id: Mapped[str | None] = mapped_column(ForeignKey("projects.id"), index=True, nullable=True)
    campaign_id: Mapped[str | None] = mapped_column(ForeignKey("campaigns.id"), index=True, nullable=True)
    platform: Mapped[str] = mapped_column(String(100), nullable=False)
    likes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    comments: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    shares: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    ctr: Mapped[float] = mapped_column(default=0.0, nullable=False)
    clicks: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    timeline: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    snapshot_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    project: Mapped[Project | None] = relationship(back_populates="analytics_snapshots")
    campaign: Mapped[Campaign | None] = relationship(back_populates="analytics_snapshots")


class Comment(Base, TimestampMixin):
    __tablename__ = "comments"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    post_id: Mapped[str] = mapped_column(ForeignKey("generated_posts.id"), index=True, nullable=False)
    author_name: Mapped[str] = mapped_column(String(255), nullable=False)
    author_handle: Mapped[str | None] = mapped_column(String(255), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    sentiment: Mapped[str] = mapped_column(String(50), default="neutral", nullable=False)

    post: Mapped[GeneratedPost] = relationship(back_populates="comments")
    suggested_replies: Mapped[list["SuggestedReply"]] = relationship(
        back_populates="comment", cascade="all, delete-orphan"
    )


class SuggestedReply(Base, TimestampMixin):
    __tablename__ = "suggested_replies"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    comment_id: Mapped[str] = mapped_column(ForeignKey("comments.id"), index=True, nullable=False)
    reply_text: Mapped[str] = mapped_column(Text, nullable=False)
    tone: Mapped[str] = mapped_column(String(100), default="friendly", nullable=False)
    platform: Mapped[str] = mapped_column(String(100), default="generic", nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="draft", nullable=False)

    comment: Mapped[Comment] = relationship(back_populates="suggested_replies")
