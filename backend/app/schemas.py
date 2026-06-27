from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.platforms import platform_names


class APIModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UserRead(APIModel):
    id: str
    email: str
    name: str
    auth_provider: str


class ProjectBase(BaseModel):
    name: str = Field(min_length=1)
    description: str = ""
    target_audience: str = ""
    goal: str = ""
    status: str = "draft"
    repo_url: str | None = None
    demo_url: str | None = None
    logo_url: str | None = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    target_audience: str | None = None
    goal: str | None = None
    status: str | None = None
    repo_url: str | None = None
    demo_url: str | None = None
    logo_url: str | None = None


class ProjectRead(ProjectBase, APIModel):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime


class CampaignPostSpec(APIModel):
    platform: str
    title: str
    content: str
    hashtags: list[str] = Field(default_factory=list)
    call_to_action: str = ""
    scheduled_at: datetime | None = None


class CampaignDaySpec(APIModel):
    day_number: int
    theme: str
    objective: str
    posts: list[CampaignPostSpec] = Field(default_factory=list)


class CampaignPlan(APIModel):
    title: str
    summary: str
    tone: str
    days: list[CampaignDaySpec] = Field(default_factory=list)


class CampaignGenerateRequest(BaseModel):
    project_id: str
    goal: str
    platforms: list[str] = Field(default_factory=list)
    tone: str = "confident"
    title: str | None = None

    @field_validator("platforms")
    @classmethod
    def validate_platforms(cls, value: list[str]) -> list[str]:
        if not value:
            raise ValueError("At least one platform must be selected")
        return value


class CampaignUpdate(BaseModel):
    title: str | None = None
    summary: str | None = None
    goal: str | None = None
    tone: str | None = None
    status: str | None = None
    platforms: list[str] | None = None


class CampaignDayRead(APIModel):
    id: str
    campaign_id: str
    day_number: int
    theme: str
    objective: str
    created_at: datetime
    updated_at: datetime


class GeneratedPostRead(APIModel):
    id: str
    campaign_id: str
    campaign_day_id: str
    platform: str
    day_number: int
    title: str
    content: str
    hashtags: list[str]
    call_to_action: str
    scheduled_at: datetime | None
    status: str
    created_at: datetime
    updated_at: datetime


class CampaignRead(APIModel):
    id: str
    project_id: str
    title: str
    summary: str
    goal: str
    tone: str
    platforms: list[str]
    status: str
    created_at: datetime
    updated_at: datetime
    days: list[CampaignDayRead] = Field(default_factory=list)


class CampaignDetail(CampaignRead):
    posts: list[GeneratedPostRead] = Field(default_factory=list)


class PostUpdate(BaseModel):
    platform: str | None = None
    title: str | None = None
    content: str | None = None
    hashtags: list[str] | None = None
    call_to_action: str | None = None
    scheduled_at: datetime | None = None
    status: str | None = None


class PlatformAccountBase(BaseModel):
    platform: str
    username: str
    bio: str = ""
    profile_image_url: str | None = None
    account_url: str | None = None
    status: str = "planned"
    notes: str = ""
    phone_required: bool = False


class PlatformAccountCreate(PlatformAccountBase):
    pass


class PlatformAccountUpdate(BaseModel):
    platform: str | None = None
    username: str | None = None
    bio: str | None = None
    profile_image_url: str | None = None
    account_url: str | None = None
    status: str | None = None
    notes: str | None = None
    phone_required: bool | None = None


class PlatformAccountRead(PlatformAccountBase, APIModel):
    id: str
    project_id: str
    created_at: datetime
    updated_at: datetime


class AutomationSessionBase(BaseModel):
    project_id: str
    platform: str
    status: str = "queued"
    step: str = "created"
    progress: int = 0
    payload: dict[str, Any] = Field(default_factory=dict)


class AutomationSessionCreate(AutomationSessionBase):
    pass


class AutomationConnectRequest(BaseModel):
    project_id: str
    platform: str
    payload: dict[str, Any] = Field(default_factory=dict)
    status: str = "queued"
    step: str = "connect_requested"
    progress: int = 0

    @field_validator("platform")
    @classmethod
    def validate_platform(cls, value: str) -> str:
        if value not in platform_names():
            raise ValueError(f"Unsupported platform: {value}")
        return value


class AutomationSessionUpdate(BaseModel):
    status: str | None = None
    step: str | None = None
    progress: int | None = None
    payload: dict[str, Any] | None = None


class AutomationSessionRead(AutomationSessionBase, APIModel):
    id: str
    created_at: datetime
    updated_at: datetime


class AnalyticsPoint(APIModel):
    date: datetime
    likes: int
    comments: int
    shares: int
    ctr: float
    clicks: int


class AnalyticsSummary(APIModel):
    likes: int
    comments: int
    shares: int
    ctr: float
    clicks: int
    best_platform: str
    engagement_timeline: list[AnalyticsPoint]


class AnalyticsDetail(AnalyticsSummary):
    project_id: str | None = None
    campaign_id: str | None = None


class CommentBase(BaseModel):
    author_name: str
    author_handle: str | None = None
    content: str
    sentiment: str = "neutral"


class CommentRead(CommentBase, APIModel):
    id: str
    post_id: str
    created_at: datetime
    updated_at: datetime


class ReplySuggestionRead(APIModel):
    id: str
    comment_id: str
    reply_text: str
    tone: str
    platform: str
    status: str
    created_at: datetime
    updated_at: datetime


class ReplySuggestionRequest(BaseModel):
    tone: str = "friendly"


class ReplySendRequest(BaseModel):
    tone: str = "friendly"


class SupportedPlatformRead(APIModel):
    name: str
    slug: str
    writing_style: str
    requires_human_verification: bool
    phone_required: str
    automation_level: str
    notes: str


class HealthRead(APIModel):
    status: str
    service: str
    auth_enabled: bool
    database_url: str
