# Virel Render + Supabase Deployment Checklist

Use this as the copy-paste reference when creating the Render backend and frontend services.

## 1) Supabase

- Create a Supabase project.
- Copy the database password from Supabase.
- Copy the project reference from the Supabase dashboard.
- Use this connection string format:

```env
DATABASE_URL=postgresql://postgres:<SUPABASE_PASSWORD>@db.<SUPABASE_PROJECT_REF>.supabase.co:5432/postgres?sslmode=require
```

## 2) Render backend service

- Service type: `Web Service`
- Runtime: `Docker`
- Dockerfile path: `backend/Dockerfile`
- Health check path: `/health`
- Root/build context: repo root

Backend env vars:

```env
DATABASE_URL=postgresql://postgres:<SUPABASE_PASSWORD>@db.<SUPABASE_PROJECT_REF>.supabase.co:5432/postgres?sslmode=require
FRONTEND_URL=https://virel-frontend.onrender.com
CORS_ORIGINS=https://virel-frontend.onrender.com
AUTH_ENABLED=false
VIREL_AUTOMATION_DIR=/app/automation
```

Optional backend env vars:

```env
OPENAI_API_KEY=<your_openai_key>
CLERK_JWKS_URL=<your_clerk_jwks_url>
```

Backend build/start behavior:

- The container listens on Render’s `PORT` automatically.
- Uvicorn runs `app.main:build_app` with `--factory`.

## 3) Render frontend service

- Service type: `Static Site`
- Root directory: `frontend`
- Build command: `npm ci && npm run build`
- Publish directory: `dist`

Frontend env vars:

```env
VITE_API_URL=https://virel-backend.onrender.com
```

## 4) Final URL map

- Frontend URL: `https://virel-frontend.onrender.com`
- Backend URL: `https://virel-backend.onrender.com`
- Supabase DB: your Supabase Postgres connection string

## 5) Quick validation

- Open `https://virel-backend.onrender.com/health`
- Confirm the frontend loads and API calls go to `https://virel-backend.onrender.com`
- If browser requests fail, confirm `CORS_ORIGINS` includes the frontend URL exactly

