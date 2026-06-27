from __future__ import annotations

import httpx

from app.analytics import providers
from app.analytics.providers import AccountMetrics, AnalyticsAccount
from app.config import Settings


def test_scrapecreators_normalizes_instagram_profile() -> None:
    account = AnalyticsAccount("project-1", "instagram", "virel")
    payload = {
        "data": {
            "user": {
                "edge_followed_by": {"count": 120},
                "edge_owner_to_timeline_media": {
                    "count": 2,
                    "edges": [
                        {
                            "node": {
                                "edge_liked_by": {"count": 10},
                                "edge_media_to_comment": {"count": 2},
                                "video_view_count": 50,
                            }
                        },
                        {
                            "node": {
                                "edge_liked_by": {"count": 8},
                                "edge_media_to_comment": {"count": 1},
                                "video_view_count": 30,
                            }
                        },
                    ],
                },
            }
        }
    }

    result = providers._scrapecreators_metrics(account, payload)

    assert result.likes == 18
    assert result.comments == 3
    assert result.views == 80
    assert result.followers == 120
    assert result.posts == 2


def test_provider_chain_falls_back_after_failure(monkeypatch) -> None:
    account = AnalyticsAccount("project-1", "instagram", "virel")
    expected = AccountMetrics("project-1", "instagram", "scrapecreators", followers=12)

    def fail_ayrshare(settings, accounts):
        raise httpx.ConnectError("unavailable")

    monkeypatch.setattr(providers, "_fetch_ayrshare", fail_ayrshare)
    monkeypatch.setattr(providers, "_fetch_scrapecreators", lambda settings, accounts: [expected])

    result = providers.collect_account_metrics(Settings(), [account])

    assert result == [expected]
