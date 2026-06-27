# Virel Backend

FastAPI backend for the Virel launch infrastructure MVP.

## What is included

- Project CRUD
- Campaign generation for three-phase launch plans
- Generated post editing and regeneration
- Platform account management
- Automation session coordination endpoints
- Provider-backed analytics with cached snapshot fallback
- Comment reply suggestion endpoints
- Optional Clerk JWT authentication
- Router modules under `app/api/routes/`
- API examples for the live backend contract

## Environment

```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5433/virel
OPENAI_API_KEY=
AYRSHARE_API_KEY=
AYRSHARE_PROFILE_KEY=
SCRAPECREATORS_API_KEY=
ANALYTICS_TIMEOUT_SECONDS=8
ANALYTICS_CACHE_TTL_SECONDS=900
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173
AUTH_ENABLED=false
CLERK_JWKS_URL=
```

## Analytics providers

Analytics tries providers in this order:

1. Ayrshare for linked-account analytics.
2. ScrapeCreators for public profile analytics not returned by Ayrshare.
3. The latest analytics snapshot already stored in the database.

Create an Ayrshare account, connect the social accounts in its dashboard, and
copy the API key into `AYRSHARE_API_KEY`. For a Business profile, also copy its
profile key into `AYRSHARE_PROFILE_KEY`.

Create a ScrapeCreators account and copy its key into
`SCRAPECREATORS_API_KEY`. This fallback uses the username stored on each Virel
platform account. Facebook and LinkedIn accounts also need a complete
`account_url`.

Provider failures and unsupported platforms are skipped. Missing metrics remain
zero; Virel does not synthesize analytics values.

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
1. Deploy the backend on Render from the `backend/` directory using its `Dockerfile`.
1. Use these Render values for the default blueprint names in `render.yaml`:

```env
DATABASE_URL=postgresql://postgres:<SUPABASE_PASSWORD>@db.<SUPABASE_PROJECT_REF>.supabase.co:5432/postgres?sslmode=require
FRONTEND_URL=https://virel-frontend.onrender.com
CORS_ORIGINS=https://virel-frontend.onrender.com
VITE_API_URL=https://virel-backend.onrender.com
```

1. Keep `OPENAI_API_KEY` and `CLERK_JWKS_URL` synced only if you are using those features.
1. The Render backend image does not bundle the local automation workspace, so automation assistant endpoints remain a local/dev concern.

## Tests

```bash
cd backend
pytest
```

## Docs

- API examples: [backend/docs/api-examples.md](./docs/api-examples.md)
