from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.ai.generator import generate_campaign_plan, validate_plan
from app.config import Settings
from app.main import build_app


@pytest.fixture()
def client(tmp_path: Path) -> TestClient:
    db_path = tmp_path / "virel-test.db"
    settings = Settings(
        database_url=f"sqlite+pysqlite:///{db_path}",
        auth_enabled=False,
        frontend_url="http://localhost:3000",
    )
    app = build_app(settings=settings)
    with TestClient(app) as test_client:
        yield test_client


def create_project(client: TestClient) -> dict:
    response = client.post(
        "/projects",
        json={
            "name": "StudySnapAI",
            "description": "AI-powered notes and study companion.",
            "target_audience": "university students",
            "goal": "drive signups",
            "status": "draft",
            "repo_url": "https://github.com/example/studysnap",
            "demo_url": "https://studysnap.example.com",
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
    assert response.json()["name"] == "StudySnapAI"

    response = client.delete(f"/projects/{project_id}")
    assert response.status_code == 204

    response = client.get(f"/projects/{project_id}")
    assert response.status_code == 404
    assert response.json()["code"] == "PROJECT_NOT_FOUND"


def test_campaign_generation_and_posts(client: TestClient) -> None:
    project = create_project(client)
    campaign = create_campaign(client, project["id"])

    assert campaign["project_id"] == project["id"]
    assert len(campaign["days"]) == 7
    assert len(campaign["posts"]) == 14

    response = client.get("/campaigns")
    assert response.status_code == 200
    assert len(response.json()) == 1

    response = client.get(f"/campaigns/{campaign['id']}/posts")
    assert response.status_code == 200
    posts = response.json()
    assert len(posts) == 14


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
    assert "likes" in response.json()

    response = client.get("/analytics/summary")
    assert response.status_code == 200
    summary = response.json()
    assert "likes" in summary
    assert summary["likes"] == 0
    assert summary["engagement_timeline"] == []

    response = client.get(f"/analytics/projects/{project['id']}")
    assert response.status_code == 200
    assert response.json()["project_id"] == project["id"]

    response = client.get(f"/analytics/campaigns/{campaign['id']}")
    assert response.status_code == 200
    assert response.json()["campaign_id"] == campaign["id"]


def test_automation_connect_endpoint(client: TestClient) -> None:
    project = create_project(client)

    response = client.post(
        "/automation/connect",
        json={
            "project_id": project["id"],
            "platform": "instagram",
            "payload": {
                "username": "studysnapai",
                "bio": "Launching soon",
            },
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["project_id"] == project["id"]
    assert body["platform"] == "instagram"
    assert body["step"] == "connect_requested"
    assert body["payload"]["username"] == "studysnapai"


def test_prompt_validation() -> None:
    plan = generate_campaign_plan(
        project_name="LaunchMate",
        description="Launch helper",
        audience="student founders",
        goal="more signups",
        platforms=["instagram"],
        tone="confident",
    )
    assert validate_plan(plan).days and len(plan.days) == 7


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
