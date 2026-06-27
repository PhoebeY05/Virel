# Virel Backend

FastAPI backend for the Virel launch infrastructure MVP.

## What is included

- Project CRUD
- Campaign generation for three-phase launch plans
- Generated post editing and regeneration
- Platform account management
- Automation session coordination endpoints
- Mock analytics endpoints
- Comment reply suggestion endpoints
- Optional Clerk JWT authentication
- Router modules under `app/api/routes/`
- API examples for the live backend contract

## Environment

```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/virel
OPENAI_API_KEY=
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173
AUTH_ENABLED=false
CLERK_JWKS_URL=
```

## Run locally

```bash
cd backend
uvicorn app.main:build_app --factory --reload --port 8000
```

If you want PostgreSQL instead of the fallback SQLite database, set `DATABASE_URL` before starting the app.

## Migrations

The repository includes an Alembic scaffold under `backend/alembic/`.

## Deploying with Supabase and Render

1. Create a Supabase database and copy the connection string.
1. Set `DATABASE_URL` to the Supabase string. If Supabase gives you a `postgresql://...` URL, this app will normalize it to the `psycopg` driver automatically.
1. Add `?sslmode=require` to the Supabase connection string if it is not already present.
1. Deploy the backend on Render using the `backend/Dockerfile`.
1. Use these Render values for the default blueprint names in `render.yaml`:

```env
DATABASE_URL=postgresql://postgres:<SUPABASE_PASSWORD>@db.<SUPABASE_PROJECT_REF>.supabase.co:5432/postgres?sslmode=require
FRONTEND_URL=https://virel-frontend.onrender.com
CORS_ORIGINS=https://virel-frontend.onrender.com
VITE_API_URL=https://virel-backend.onrender.com
```

1. Keep `OPENAI_API_KEY` and `CLERK_JWKS_URL` synced only if you are using those features.

## Tests

```bash
cd backend
pytest
```

## Docs

- API examples: [backend/docs/api-examples.md](./docs/api-examples.md)
