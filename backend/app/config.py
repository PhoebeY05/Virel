from functools import lru_cache

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Virel API"
    database_url: str = Field(
        default="sqlite+pysqlite:///./virel.db",
        description="Database connection string",
    )
    media_dir: str = "./media"
    frontend_url: AnyHttpUrl = "http://localhost:3000"
    openai_api_key: str | None = None
    openai_model: str = "gpt-4.1-mini"
    auth_enabled: bool = False
    clerk_jwks_url: str | None = None
    local_user_id: str = "local-user"
    local_user_email: str = "local@virel.local"
    local_user_name: str = "Local User"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
