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
    cors_origins: str | None = Field(
        default=None,
        description="Comma-separated list of extra allowed CORS origins",
    )
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

    def get_cors_origins(self) -> list[str]:
        origins = {
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            str(self.frontend_url).rstrip("/"),
        }

        if self.cors_origins:
            origins.update(
                origin.strip().rstrip("/")
                for origin in self.cors_origins.split(",")
                if origin.strip()
            )

        return sorted(origins)


@lru_cache
def get_settings() -> Settings:
    return Settings()
