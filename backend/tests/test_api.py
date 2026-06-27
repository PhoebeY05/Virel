from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.ai.generator import generate_campaign_plan, validate_plan
from app.config import Settings
from app.models import AnalyticsSnapshot, PlatformAccount
from app.main import build_app


@pytest.fixture()
def client(tmp_path: Path) -> TestClient:
    db_path = tmp_path / "virel-test.db"
    settings = Settings(
        database_url=f"sqlite+pysqlite:///{db_path}",
        auth_enabled=False,
        frontend_url="http://localhost:3000",
        media_dir=str(tmp_path / "media"),
    )
    app = build_app(settings=settings)
    with TestClient(app) as test_client:
        yield test_client


def create_project(client: TestClient) -> dict:
    response = client.post(
        "/projects",
        json={
            "name": "Virel",
            "description": "A launch operations workspace for student projects.",
            "target_audience": "student founders",
            "goal": "drive project launches",
            "status": "draft",
            "repo_url": "https://github.com/example/virel",
            "demo_url": "https://virel.example.com",
            "logo_url": "https://cdn.example.com/logo.png",
        },
    )
    assert response.status_code == 201
    return response.json()


def create_campaign(client: TestClient, project_id: str) -> dict:
    response = client.post(
        "/campaigns/generate",
        json={
            "project_id": project_id,
            "goal": "drive signups",
            "platforms": ["instagram", "reddit"],
            "tone": "confident",
        },
    )
    assert response.status_code == 201
    return response.json()


def create_snapshot(
    client: TestClient,
    *,
    project_id: str,
    campaign_id: str,
    platform: str,
    likes: int,
    comments: int,
    shares: int,
    clicks: int,
    ctr: float,
) -> None:
    session_factory = client.app.state.SessionLocal
    with session_factory() as db:
        db.add(
            AnalyticsSnapshot(
                project_id=project_id,
                campaign_id=campaign_id,
                platform=platform,
                likes=likes,
                comments=comments,
                shares=shares,
                clicks=clicks,
                ctr=ctr,
                timeline=[],
            )
        )
        db.commit()


def test_health_endpoint(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_project_crud(client: TestClient) -> None:
    project = create_project(client)
    project_id = project["id"]

    response = client.get("/projects")
    assert response.status_code == 200
    assert any(item["id"] == project_id for item in response.json())

    response = client.patch(f"/projects/{project_id}", json={"status": "active"})
    assert response.status_code == 200
    assert response.json()["status"] == "active"

    response = client.get(f"/projects/{project_id}")
    assert response.status_code == 200
    assert response.json()["name"] == "Virel"

    response = client.delete(f"/projects/{project_id}")
    assert response.status_code == 204

    response = client.get(f"/projects/{project_id}")
    assert response.status_code == 404
    assert response.json()["code"] == "PROJECT_NOT_FOUND"


def test_project_delete_cascades_platform_accounts(client: TestClient) -> None:
    project = create_project(client)

    response = client.post(
        f"/projects/{project['id']}/accounts",
        json={
            "platform": "instagram",
            "username": "@virel",
            "bio": "Launch updates and community announcements.",
            "phone_required": False,
        },
    )
    assert response.status_code == 201
    account_id = response.json()["id"]

    response = client.delete(f"/projects/{project['id']}")
    assert response.status_code == 204

    with client.app.state.SessionLocal() as db:
        rows = db.scalars(select(PlatformAccount).where(PlatformAccount.project_id == project["id"])).all()
    assert rows == []

    response = client.get(f"/projects/{project['id']}/accounts")
    assert response.status_code == 404
    assert response.json()["code"] == "PROJECT_NOT_FOUND"

    with client.app.state.SessionLocal() as db:
        account = db.scalar(select(PlatformAccount).where(PlatformAccount.id == account_id))
    assert account is None


def test_campaign_generation_and_posts(client: TestClient) -> None:
    project = create_project(client)
    campaign = create_campaign(client, project["id"])

    assert campaign["project_id"] == project["id"]
    assert campaign["status"] == "live"
    assert len(campaign["phases"]) == 3
    assert len(campaign["posts"]) == 6
    assert campaign["posts"][0]["status"] == "published"

    response = client.get("/campaigns")
    assert response.status_code == 200
    assert len(response.json()) == 1

    response = client.get(f"/campaigns/{campaign['id']}/posts")
    assert response.status_code == 200
    posts = response.json()
    assert len(posts) == 6


def test_campaign_generation_produces_multiple_posts_per_phase(client: TestClient) -> None:
    project = create_project(client)

    response = client.post(
        "/campaigns/generate",
        json={
            "project_id": project["id"],
            "goal": "drive signups",
            "platforms": ["instagram"],
            "tone": "confident",
        },
    )
    assert response.status_code == 201
    campaign = response.json()
    assert campaign["status"] == "live"
    assert len(campaign["phases"]) == 3
    assert len(campaign["posts"]) == 6
    assert campaign["posts"][0]["status"] == "published"
    assert all(len(phase["posts"]) >= 2 for phase in campaign["phases"])


def test_post_editing_and_regeneration(client: TestClient) -> None:
    project = create_project(client)
    campaign = create_campaign(client, project["id"])
    posts = client.get(f"/campaigns/{campaign['id']}/posts").json()
    post_id = posts[0]["id"]

    response = client.patch(f"/posts/{post_id}", json={"status": "queued", "title": "Updated title"})
    assert response.status_code == 200
    assert response.json()["status"] == "queued"
    assert response.json()["title"] == "Updated title"

    response = client.post(f"/posts/{post_id}/regenerate")
    assert response.status_code == 200
    assert response.json()["status"] == "scheduled"
    assert response.json()["content"]


def test_analytics_endpoints(client: TestClient) -> None:
    project = create_project(client)
    campaign = create_campaign(client, project["id"])

    response = client.get("/analytics")
    assert response.status_code == 200
    body = response.json()
    assert body["likes"] == 0
    assert body["comments"] == 0
    assert body["shares"] == 0
    assert body["clicks"] == 0
    assert body["engagement"] == 0
    assert response.json()["total_projects"] == 1
    assert response.json()["active_campaigns"] == 1
    assert response.json()["platforms"] == []
    assert response.json()["top_posts"] == []
    assert response.json()["engagement_timeline"] == []

    create_snapshot(
        client,
        project_id=project["id"],
        campaign_id=campaign["id"],
        platform="instagram",
        likes=40,
        comments=5,
        shares=2,
        clicks=11,
        ctr=0.061,
    )
    create_snapshot(
        client,
        project_id=project["id"],
        campaign_id=campaign["id"],
        platform="reddit",
        likes=12,
        comments=3,
        shares=1,
        clicks=7,
        ctr=0.033,
    )

    response = client.get("/analytics")
    assert response.status_code == 200
    body = response.json()
    assert body["likes"] == 52
    assert body["comments"] == 8
    assert body["shares"] == 3
    assert body["clicks"] == 18
    assert body["engagement"] == 81
    assert body["best_platform"] == "instagram"
    assert len(body["platforms"]) == 2
    assert body["platforms"][0]["platform"] == "instagram"
    assert len(body["engagement_timeline"]) == 2
    assert body["top_posts"] == []

    response = client.get("/analytics/summary")
    assert response.status_code == 200
    summary = response.json()
    assert summary["likes"] == 52
    assert len(summary["engagement_timeline"]) == 2
    assert summary["best_platform"] == "instagram"

    response = client.get(f"/analytics/projects/{project['id']}")
    assert response.status_code == 200
    assert response.json()["project_id"] == project["id"]
    assert response.json()["engagement"] == 81

    response = client.get(f"/analytics/campaigns/{campaign['id']}")
    assert response.status_code == 200
    assert response.json()["campaign_id"] == campaign["id"]
    assert response.json()["engagement"] == 81

    response = client.get("/analytics/platforms")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    assert response.json()[0]["likes"] == 40


def test_settings_endpoints(client: TestClient) -> None:
    response = client.get("/settings")
    assert response.status_code == 200
    body = response.json()
    assert body["company_name"] == ""
    assert body["support_email"] == "demo@virel.local"

    response = client.put(
        "/settings",
        json={
            "company_name": "Virel Labs",
            "support_email": "support@virel.example.com",
            "website_url": "https://virel.example.com",
            "phone_number": "+65 9123 4567",
            "profile_image_url": "https://cdn.example.com/avatar.png",
            "google_link_status": "Linked",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["company_name"] == "Virel Labs"
    assert body["google_link_status"] == "Linked"

    response = client.get("/settings")
    assert response.status_code == 200
    assert response.json()["company_name"] == "Virel Labs"


def test_automation_connect_endpoint(client: TestClient) -> None:
    project = create_project(client)

    response = client.post(
        "/automation/connect",
        json={
            "project_id": project["id"],
            "platform": "instagram",
            "payload": {
                "bio": "Launching soon",
            },
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["project_id"] == project["id"]
    assert body["platform"] == "instagram"
    assert body["step"] == "connect_requested"
    assert body["payload"]["username"] == "@virel"
    assert body["payload"]["company_name"] == "Virel"
    assert body["payload"]["project_name"] == "Virel"
    assert body["payload"]["project_description"] == "A launch operations workspace for student projects."
    assert body["payload"]["project_demo_url"] == "https://virel.example.com"
    assert body["payload"]["project_repo_url"] == "https://github.com/example/virel"

    response = client.get("/automation/sessions")
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_automation_smoke_batch_endpoint(client: TestClient, monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    automation_dir = tmp_path / "automation"
    automation_dir.mkdir()
    monkeypatch.setenv("DISPLAY", ":1")
    monkeypatch.setattr("app.api.routes.automation.resolve_automation_dir", lambda: automation_dir)

    captured: dict[str, object] = {}

    class FakeProcess:
        pid = 4321

    def fake_popen(command, **kwargs):
        captured["command"] = command
        captured["kwargs"] = kwargs
        return FakeProcess()

    monkeypatch.setattr("app.api.routes.automation.subprocess.Popen", fake_popen)

    response = client.post(
        "/automation/test-setup/batch",
        json={
            "runs": [
                {
                    "platform": "instagram",
                    "signupMethod": "email",
                    "email": "team@example.com",
                    "username": "studysnapai-instagram",
                    "displayName": "StudySnap AI",
                    "bio": "Testing the Instagram launch flow.",
                    "holdMs": 5000,
                },
                {
                    "platform": "telegram",
                    "signupMethod": "email",
                    "username": "studysnapai-telegram",
                    "displayName": "StudySnap AI",
                    "bio": "Testing the Telegram launch flow.",
                    "holdMs": 5000,
                },
            ]
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "started"
    assert body["pid"] == 4321
    assert body["count"] == 2
    assert body["platforms"] == ["instagram", "telegram"]
    assert body["logPath"].startswith(str(automation_dir / "logs"))

    command = captured["command"]
    assert isinstance(command, list)
    assert "smoke-batch" in command


def test_platform_account_crud(client: TestClient) -> None:
    project = create_project(client)

    response = client.post(
        f"/projects/{project['id']}/accounts",
        json={
            "platform": "telegram",
            "username": "@virel",
            "bio": "Launch updates and community announcements.",
            "profile_image_url": "https://cdn.example.com/avatar.png",
            "account_url": "https://t.me/virel",
            "status": "pending",
            "notes": "Prepared during onboarding.",
            "phone_required": False,
        },
    )
    assert response.status_code == 201
    account = response.json()
    assert account["platform"] == "telegram"
    assert account["username"] == "@virel"

    response = client.get(f"/projects/{project['id']}/accounts")
    assert response.status_code == 200
    assert len(response.json()) == 1

    response = client.patch(
        f"/accounts/{account['id']}",
        json={
            "status": "connected",
            "notes": "Connected in the simulator.",
            "session_path": "/tmp/storage-state/telegram.json",
        },
    )
    assert response.status_code == 200
    assert response.json()["status"] == "connected"
    assert response.json()["session_path"] == "/tmp/storage-state/telegram.json"

    response = client.delete(f"/accounts/{account['id']}")
    assert response.status_code == 204

    response = client.get(f"/projects/{project['id']}/accounts")
    assert response.status_code == 200
    assert response.json() == []


def test_image_upload_endpoint(client: TestClient) -> None:
    project = create_project(client)
    response = client.post(
        "/uploads/image",
        files={"file": ("logo.png", b"fake-png-bytes", "image/png")},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["url"].startswith("http://testserver/media/")
    assert body["content_type"] == "image/png"
    assert body["size"] == len(b"fake-png-bytes")


def test_supported_platforms_include_telegram(client: TestClient) -> None:
    response = client.get("/platforms")
    assert response.status_code == 200
    platforms = response.json()
    slugs = {platform["slug"] for platform in platforms}
    assert "telegram" in slugs
    assert "discord" not in slugs
    assert "product_hunt" not in slugs


def test_prompt_validation() -> None:
    plan = generate_campaign_plan(
        project_name="LaunchMate",
        description="Launch helper",
        audience="student founders",
        goal="more signups",
        platforms=["instagram"],
        tone="confident",
    )
    assert validate_plan(plan).days and len(plan.days) == 3


def test_duplicate_campaign_generation_is_blocked(client: TestClient) -> None:
    project = create_project(client)
    first_campaign = create_campaign(client, project["id"])

    response = client.post(
        "/campaigns/generate",
        json={
            "project_id": project["id"],
            "goal": "drive signups",
            "platforms": ["instagram", "reddit"],
            "tone": "confident",
        },
    )

    assert response.status_code == 409
    assert response.json()["code"] == "CAMPAIGN_DUPLICATE"
    assert first_campaign["id"]


def test_auth_middleware_blocks_when_enabled(tmp_path: Path) -> None:
    db_path = tmp_path / "auth-test.db"
    settings = Settings(
        database_url=f"sqlite+pysqlite:///{db_path}",
        auth_enabled=True,
        frontend_url="http://localhost:3000",
        clerk_jwks_url=None,
    )
    app = build_app(settings=settings)
    with TestClient(app) as client:
        assert client.get("/health").status_code == 200
        response = client.get("/projects")
        assert response.status_code == 401
        assert response.json()["code"] == "AUTH_REQUIRED"
