# Virel Backend Tutorial

This walkthrough shows how to use the API with a realistic demo project instead of a seed script.

## Demo project

Use this sample project throughout the tutorial:

```json
{
  "name": "StudySnapAI",
  "description": "An AI study companion that turns lecture notes into flashcards, summaries, and revision plans.",
  "target_audience": "university students preparing for exams",
  "goal": "drive signups and demo requests",
  "status": "draft",
  "repo_url": "https://github.com/example/studysnapai",
  "demo_url": "https://studysnap.example.com",
  "logo_url": "https://cdn.example.com/studysnap-logo.png"
}
```

## Step 1: create the project

```bash
curl -X POST http://localhost:8000/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "StudySnapAI",
    "description": "An AI study companion that turns lecture notes into flashcards, summaries, and revision plans.",
    "target_audience": "university students preparing for exams",
    "goal": "drive signups and demo requests",
    "status": "draft",
    "repo_url": "https://github.com/example/studysnapai",
    "demo_url": "https://studysnap.example.com",
    "logo_url": "https://cdn.example.com/studysnap-logo.png"
  }'
```

## Step 2: generate a campaign

```bash
curl -X POST http://localhost:8000/campaigns/generate \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "<paste_project_id_here>",
    "goal": "drive signups and demo requests",
    "platforms": ["instagram", "linkedin", "reddit"],
    "tone": "confident"
  }'
```

This returns a seven-day campaign plan plus platform-specific posts.

## Step 3: inspect the generated outputs

```bash
curl http://localhost:8000/projects
curl http://localhost:8000/campaigns
curl http://localhost:8000/analytics
curl http://localhost:8000/platforms
```

## Step 4: connect automation later

The automation service can ask the backend to create a connection session:

```bash
curl -X POST http://localhost:8000/automation/connect \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "<paste_project_id_here>",
    "platform": "instagram",
    "payload": {
      "username": "studysnapai",
      "bio": "Study smarter, not harder."
    }
  }'
```

## What the tutorial demonstrates

- A single branded demo project
- Real API calls instead of scripted seed data
- A campaign generated from project context
- Analytics and platform metadata ready for the frontend

