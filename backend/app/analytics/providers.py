from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

import httpx

from app.config import Settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class AnalyticsAccount:
    project_id: str
    platform: str
    username: str
    account_url: str | None = None


@dataclass(frozen=True)
class AccountMetrics:
    project_id: str
    platform: str
    source: str
    likes: int = 0
    comments: int = 0
    shares: int = 0
    views: int = 0
    followers: int = 0
    posts: int = 0

    @property
    def has_data(self) -> bool:
        return any((self.likes, self.comments, self.shares, self.views, self.followers, self.posts))


AYRSHARE_PLATFORMS = {
    "facebook",
    "instagram",
    "linkedin",
    "reddit",
    "tiktok",
    "twitter",
}

SCRAPECREATORS_ENDPOINTS = {
    "facebook": ("/v1/facebook/profile", "url"),
    "instagram": ("/v1/instagram/profile", "handle"),
    "linkedin": ("/v1/linkedin/profile", "url"),
    "tiktok": ("/v1/tiktok/profile", "handle"),
    "twitter": ("/v1/twitter/profile", "handle"),
}


def _platform_slug(value: str) -> str:
    normalized = value.strip().lower().replace(" ", "_")
    return {"x": "twitter", "product_hunt": "product_hunt"}.get(normalized, normalized)


def _number(value: Any) -> int:
    if isinstance(value, bool):
        return 0
    if isinstance(value, (int, float)):
        return max(0, int(value))
    if isinstance(value, str):
        try:
            return max(0, int(float(value.replace(",", ""))))
        except ValueError:
            return 0
    return 0


def _find_number(payload: Any, aliases: tuple[str, ...]) -> int:
    if isinstance(payload, dict):
        for alias in aliases:
            if alias in payload:
                value = _number(payload[alias])
                if value:
                    return value
        for value in payload.values():
            found = _find_number(value, aliases)
            if found:
                return found
    elif isinstance(payload, list):
        for value in payload:
            found = _find_number(value, aliases)
            if found:
                return found
    return 0


def _sum_nested(payload: Any, aliases: tuple[str, ...]) -> int:
    total = 0
    if isinstance(payload, dict):
        for key, value in payload.items():
            if key in aliases:
                total += _number(value)
                if isinstance(value, dict):
                    total += _find_number(value, ("count",))
            else:
                total += _sum_nested(value, aliases)
    elif isinstance(payload, list):
        total += sum(_sum_nested(item, aliases) for item in payload)
    return total


def _ayrshare_metrics(account: AnalyticsAccount, payload: dict[str, Any]) -> AccountMetrics:
    analytics = payload.get("analytics", payload)
    return AccountMetrics(
        project_id=account.project_id,
        platform=account.platform,
        source="ayrshare",
        likes=_find_number(analytics, ("likeCount", "likesCount", "likes", "totalLikes")),
        comments=_find_number(analytics, ("commentsCount", "commentCount", "comments")),
        shares=_find_number(analytics, ("shareCount", "sharesCount", "shares")),
        views=_find_number(
            analytics,
            ("viewsCount", "viewCount", "impressionCount", "pageMediaView", "pageVideoViews"),
        ),
        followers=_find_number(
            analytics,
            ("followersCount", "followerCount", "totalFollowerCount", "fanCount", "subscribers"),
        ),
        posts=_find_number(analytics, ("mediaCount", "postsCount", "postCount", "videoCount", "tweetCount")),
    )


def _scrapecreators_metrics(account: AnalyticsAccount, payload: dict[str, Any]) -> AccountMetrics:
    platform = _platform_slug(account.platform)
    if platform == "instagram":
        user = payload.get("data", {}).get("user", payload)
        timeline = user.get("edge_owner_to_timeline_media", {})
        media = timeline.get("edges", [])
        return AccountMetrics(
            account.project_id,
            account.platform,
            "scrapecreators",
            likes=_sum_nested(media, ("edge_liked_by", "like_count")),
            comments=_sum_nested(media, ("edge_media_to_comment", "comment_count")),
            views=_sum_nested(media, ("video_view_count", "view_count")),
            followers=_find_number(user.get("edge_followed_by", {}), ("count",)),
            posts=_number(timeline.get("count")),
        )
    if platform == "tiktok":
        stats = payload.get("userInfo", {}).get("stats") or payload.get("stats") or payload
        return AccountMetrics(
            account.project_id,
            account.platform,
            "scrapecreators",
            likes=_find_number(stats, ("heartCount", "heart", "diggCount")),
            followers=_find_number(stats, ("followerCount", "followers")),
            posts=_find_number(stats, ("videoCount", "videos")),
        )
    if platform == "twitter":
        legacy = payload.get("legacy", payload)
        return AccountMetrics(
            account.project_id,
            account.platform,
            "scrapecreators",
            followers=_find_number(legacy, ("followers_count",)),
            posts=_find_number(legacy, ("statuses_count",)),
        )
    if platform == "facebook":
        return AccountMetrics(
            account.project_id,
            account.platform,
            "scrapecreators",
            likes=_find_number(payload, ("likeCount",)),
            followers=_find_number(payload, ("followerCount",)),
            posts=_find_number(payload, ("postCount",)),
        )
    if platform == "linkedin":
        recent_posts = payload.get("recentPosts", [])
        return AccountMetrics(
            account.project_id,
            account.platform,
            "scrapecreators",
            followers=_find_number(payload, ("followers", "followersCount")),
            posts=len(recent_posts) if isinstance(recent_posts, list) else 0,
        )
    return AccountMetrics(account.project_id, account.platform, "scrapecreators")


def _fetch_ayrshare(settings: Settings, accounts: list[AnalyticsAccount]) -> list[AccountMetrics]:
    if not settings.ayrshare_api_key:
        return []
    supported = [account for account in accounts if _platform_slug(account.platform) in AYRSHARE_PLATFORMS]
    if not supported:
        return []

    platforms = list(dict.fromkeys(_platform_slug(account.platform) for account in supported))
    headers = {"Authorization": f"Bearer {settings.ayrshare_api_key}"}
    if settings.ayrshare_profile_key:
        headers["Profile-Key"] = settings.ayrshare_profile_key
    with httpx.Client(timeout=settings.analytics_timeout_seconds) as client:
        response = client.post(
            "https://api.ayrshare.com/api/analytics/social",
            headers=headers,
            json={"platforms": platforms, "quarters": 1},
        )
        response.raise_for_status()
        payload = response.json()

    metrics: list[AccountMetrics] = []
    for account in supported:
        platform_payload = payload.get(_platform_slug(account.platform))
        if isinstance(platform_payload, dict):
            normalized = _ayrshare_metrics(account, platform_payload)
            if normalized.has_data:
                metrics.append(normalized)
    return metrics


def _fetch_scrapecreators(
    settings: Settings,
    accounts: list[AnalyticsAccount],
) -> list[AccountMetrics]:
    if not settings.scrapecreators_api_key:
        return []

    metrics: list[AccountMetrics] = []
    headers = {"x-api-key": settings.scrapecreators_api_key}
    with httpx.Client(base_url="https://api.scrapecreators.com", timeout=settings.analytics_timeout_seconds) as client:
        for account in accounts:
            endpoint_config = SCRAPECREATORS_ENDPOINTS.get(_platform_slug(account.platform))
            if not endpoint_config:
                continue
            endpoint, parameter = endpoint_config
            identifier = account.account_url if parameter == "url" else account.username.lstrip("@")
            if not identifier:
                continue
            try:
                response = client.get(endpoint, headers=headers, params={parameter: identifier, "trim": "true"})
                response.raise_for_status()
                normalized = _scrapecreators_metrics(account, response.json())
                if normalized.has_data:
                    metrics.append(normalized)
            except (httpx.HTTPError, ValueError, TypeError) as exc:
                logger.warning(
                    "ScrapeCreators failed for %s/%s: %s",
                    account.project_id,
                    account.platform,
                    exc,
                )
    return metrics


def collect_account_metrics(settings: Settings, accounts: list[AnalyticsAccount]) -> list[AccountMetrics]:
    remaining = list(accounts)
    collected: list[AccountMetrics] = []
    providers = (
        ("ayrshare", _fetch_ayrshare),
        ("scrapecreators", _fetch_scrapecreators),
    )

    for provider_name, provider in providers:
        if not remaining:
            break
        try:
            results = provider(settings, remaining)
        except (httpx.HTTPError, ValueError, TypeError) as exc:
            logger.warning("Analytics provider %s failed: %s", provider_name, exc)
            continue
        collected.extend(results)
        resolved = {(item.project_id, _platform_slug(item.platform)) for item in results}
        remaining = [
            account
            for account in remaining
            if (account.project_id, _platform_slug(account.platform)) not in resolved
        ]

    return collected
