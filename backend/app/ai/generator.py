from __future__ import annotations

import json
import math
import re
from datetime import datetime, timedelta, timezone
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.ai.prompts.campaign import build_campaign_prompt
from app.ai.prompts.reply import build_reply_prompt
from app.platforms import SUPPORTED_PLATFORM_MAP, platform_names


class PromptValidationError(ValueError):
    pass


class CampaignPostPlan(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    platform: str
    title: str
    content: str
    hashtags: list[str] = Field(default_factory=list)
    call_to_action: str = ""
    scheduled_at: datetime | None = None


class CampaignDayPlan(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    day_number: int
    theme: str
    objective: str
    posts: list[CampaignPostPlan] = Field(default_factory=list)


class CampaignPlan(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    title: str
    summary: str
    tone: str
    days: list[CampaignDayPlan] = Field(default_factory=list)


class ReplyPlan(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    reply_text: str


def _strip_json_block(text: str) -> str:
    fenced = re.search(r"```(?:json)?\s*(.*?)```", text, re.DOTALL | re.IGNORECASE)
    if fenced:
        return fenced.group(1).strip()
    return text.strip()


def _platform_style(platform: str) -> str:
    info = SUPPORTED_PLATFORM_MAP.get(platform)
    return info.writing_style if info else "clear, concise, and brand-safe."


def _fallback_hashtags(project_name: str, platform: str) -> list[str]:
    slug = re.sub(r"[^a-z0-9]+", "", project_name.lower())[:20] or "launch"
    base = [
        f"#{slug}",
        f"#{platform.replace('_', '')}",
        "#studentbuild",
    ]
    if platform in {"instagram", "tiktok", "facebook"}:
        base.append("#startup")
    return base[:4]


def _fallback_campaign_plan(
    project_name: str,
    description: str,
    audience: str,
    goal: str,
    platforms: list[str],
    tone: str,
) -> CampaignPlan:
    now = datetime.now(timezone.utc)
    themes = [
        ("Big reveal", "Introduce the project and make the promise clear."),
        ("Problem framing", "Show the pain point the project solves."),
        ("How it works", "Explain the product in a simple, credible way."),
        ("Social proof", "Add early traction, team context, or proof points."),
        ("Behind the scenes", "Humanise the team and process."),
        ("Launch push", "Ask for visits, feedback, signups, or shares."),
        ("Follow-up", "Reinforce value and create a final nudge."),
    ]
    days: list[CampaignDayPlan] = []
    selected_platforms = platforms or platform_names()
    for index, (theme, objective) in enumerate(themes, start=1):
        posts: list[CampaignPostPlan] = []
        for platform_index, platform in enumerate(selected_platforms):
            style = _platform_style(platform)
            title = f"{project_name} Day {index}: {theme}"
            content = (
                f"{project_name} is built for {audience}. "
                f"Today we focus on {theme.lower()} by showing how it helps with {goal}. "
                f"Tone: {tone}. Platform style: {style}. "
                f"Context: {description}"
            )
            scheduled_at = now + timedelta(days=index - 1, hours=platform_index * 2)
            posts.append(
                CampaignPostPlan(
                    platform=platform,
                    title=title,
                    content=content,
                    hashtags=_fallback_hashtags(project_name, platform),
                    call_to_action="Try the demo and share feedback.",
                    scheduled_at=scheduled_at,
                )
            )
        days.append(CampaignDayPlan(day_number=index, theme=theme, objective=objective, posts=posts))
    return CampaignPlan(
        title=f"{project_name} launch campaign",
        summary=f"A 7-day launch plan to reach {audience} and drive {goal}.",
        tone=tone,
        days=days,
    )


def generate_campaign_plan(
    project_name: str,
    description: str,
    audience: str,
    goal: str,
    platforms: list[str],
    tone: str,
    openai_api_key: str | None = None,
    model: str = "gpt-4.1-mini",
) -> CampaignPlan:
    prompt = build_campaign_prompt(project_name, description, audience, goal, platforms, tone)
    if openai_api_key:
        try:
            from openai import OpenAI

            client = OpenAI(api_key=openai_api_key)
            response = client.responses.create(
                model=model,
                input=prompt,
            )
            raw_text = getattr(response, "output_text", "") or ""
            payload_text = _strip_json_block(raw_text)
            return CampaignPlan.model_validate(json.loads(payload_text))
        except Exception:
            pass
    return _fallback_campaign_plan(project_name, description, audience, goal, platforms, tone)


def generate_reply(
    project_description: str,
    post_content: str,
    comment: str,
    tone: str,
    platform: str,
    openai_api_key: str | None = None,
    model: str = "gpt-4.1-mini",
) -> ReplyPlan:
    prompt = build_reply_prompt(project_description, post_content, comment, tone, platform)
    if openai_api_key:
        try:
            from openai import OpenAI

            client = OpenAI(api_key=openai_api_key)
            response = client.responses.create(model=model, input=prompt)
            raw_text = getattr(response, "output_text", "") or ""
            payload_text = _strip_json_block(raw_text)
            return ReplyPlan.model_validate(json.loads(payload_text))
        except Exception:
            pass

    reply_text = (
        f"Thanks for the feedback! We built this for people like you, and we're actively improving it. "
        f"If you try it, let us know what you think."
    )
    if platform == "reddit":
        reply_text = (
            "Appreciate the honest take. We built this for student projects, so feedback like this helps a lot. "
            "Happy to share more details if useful."
        )
    elif platform in {"linkedin", "product_hunt"}:
        reply_text = (
            "Thanks for taking a look. We're using this feedback to refine the launch experience and make the product more useful."
        )
    return ReplyPlan(reply_text=reply_text)


def validate_plan(plan: CampaignPlan) -> CampaignPlan:
    if len(plan.days) != 7:
        raise PromptValidationError("Campaign plans must contain exactly seven days")
    if not plan.days:
        raise PromptValidationError("Campaign plans cannot be empty")
    for day in plan.days:
        if day.day_number < 1 or day.day_number > 7:
            raise PromptValidationError("Campaign day numbers must be between 1 and 7")
        for post in day.posts:
            if post.platform not in platform_names():
                raise PromptValidationError(f"Unsupported platform: {post.platform}")
            if not post.title or not post.content:
                raise PromptValidationError("Posts must include title and content")
    return plan


def fallback_reply_text(platform: str, tone: str) -> str:
    plan = generate_reply("", "", "", tone, platform, openai_api_key=None)
    return plan.reply_text

