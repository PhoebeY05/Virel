from functools import lru_cache

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Virel API"
    database_url: str = Field(
        default="sqlite+pysqlite:///./virel.db",
        description="Database connection string",
    )
    frontend_url: AnyHttpUrl = "http://localhost:3000"
    openai_api_key: str | None = None
    openai_model: str = "gpt-4.1-mini"
    auth_enabled: bool = False
    clerk_jwks_url: str | None = None
    demo_user_id: str = "demo-user"
    demo_user_email: str = "demo@virel.local"
    demo_user_name: str = "Demo User"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()

