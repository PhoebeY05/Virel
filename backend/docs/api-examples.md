# Virel API Examples

These examples match the backend contract the frontend team will consume.

## `GET /projects`

```json
[
  {
    "id": "proj_123",
    "user_id": "user_123",
    "name": "StudySnapAI",
    "description": "An AI study companion...",
    "target_audience": "university students",
    "goal": "drive signups",
    "status": "draft",
    "repo_url": "https://github.com/example/studysnapai",
    "demo_url": "https://studysnap.example.com",
    "logo_url": "https://cdn.example.com/studysnap-logo.png",
    "created_at": "2026-06-27T00:00:00Z",
    "updated_at": "2026-06-27T00:00:00Z"
  }
]
```

## `POST /projects`

Request:

```json
{
  "name": "StudySnapAI",
  "description": "An AI study companion...",
  "target_audience": "university students",
  "goal": "drive signups",
  "status": "draft",
  "repo_url": "https://github.com/example/studysnapai",
  "demo_url": "https://studysnap.example.com",
  "logo_url": "https://cdn.example.com/studysnap-logo.png"
}
```

## `POST /campaigns/generate`

Request:

```json
{
  "project_id": "proj_123",
  "goal": "drive signups",
  "platforms": ["instagram", "linkedin", "reddit"],
  "tone": "confident"
}
```

## `GET /campaigns`

Returns campaign metadata, seven campaign days, and generated posts.

## `GET /analytics`

Returns:

```json
{
  "likes": 1234,
  "comments": 87,
  "shares": 52,
  "ctr": 0.041,
  "clicks": 310,
  "best_platform": "instagram",
  "engagement_timeline": []
}
```

## `GET /platforms`

Returns the supported platform catalog, including writing style and automation guidance.

## `POST /automation/connect`

Request:

```json
{
  "project_id": "proj_123",
  "platform": "instagram",
  "payload": {
    "username": "studysnapai",
    "bio": "Study smarter, not harder."
  }
}
```

This creates an automation session the Playwright service can pick up later.

