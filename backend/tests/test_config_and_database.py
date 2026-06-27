from __future__ import annotations

from app.config import Settings
from app.database import normalize_database_url


def test_normalize_database_url_handles_supabase_style_urls() -> None:
    assert (
        normalize_database_url("postgresql://postgres:secret@db.example.supabase.co:5432/postgres?sslmode=require")
        == "postgresql+psycopg://postgres:secret@db.example.supabase.co:5432/postgres?sslmode=require"
    )
    assert (
        normalize_database_url("postgres://postgres:secret@db.example.supabase.co:5432/postgres?sslmode=require")
        == "postgresql+psycopg://postgres:secret@db.example.supabase.co:5432/postgres?sslmode=require"
    )


def test_settings_collects_render_and_local_cors_origins() -> None:
    settings = Settings(
        frontend_url="https://virel-frontend.onrender.com",
        cors_origins="https://virel-frontend.onrender.com,http://localhost:3000",
    )

    assert settings.get_cors_origins() == [
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:5173",
        "https://virel-frontend.onrender.com",
    ]
