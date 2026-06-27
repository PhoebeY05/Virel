# Virel Backend

FastAPI backend for the Virel launch infrastructure MVP.

## What is included

- Project CRUD
- Campaign generation for 7-day launch plans
- Generated post editing and regeneration
- Platform account management
- Automation session coordination endpoints
- Mock analytics endpoints
- Comment reply suggestion endpoints
- Optional Clerk JWT authentication
- Router modules under `app/api/routes/`
- API examples and a tutorial-driven demo dataset walkthrough

## Environment

```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/virel
OPENAI_API_KEY=
FRONTEND_URL=http://localhost:3000
AUTH_ENABLED=false
CLERK_JWKS_URL=
```

## Run locally

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

If you want PostgreSQL instead of the fallback SQLite database, set `DATABASE_URL` before starting the app.

## Migrations

The repository includes an Alembic scaffold under `backend/alembic/`.

## Tests

```bash
cd backend
pytest
```

## Docs

- Tutorial: [backend/docs/tutorial.md](./docs/tutorial.md)
- API examples: [backend/docs/api-examples.md](./docs/api-examples.md)

