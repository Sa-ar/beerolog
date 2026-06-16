from functools import lru_cache
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        enable_decoding=False,
        extra="ignore",
    )

    app_env: Literal["development", "preview", "production"] = "development"
    database_url: str = ""
    openai_api_key: str = ""
    clerk_secret_key: str = ""
    clerk_publishable_key: str = ""
    api_secret: str = "dev-secret"
    cors_allowed_origins: list[str] = ["http://localhost:3000"]
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"

    # Taste-profile matcher knobs (PRD: taste-profile-matcher.md)
    match_alpha: float = 0.6
    match_beta: float = 0.3
    baseline_staleness_days: int = 7
    embedding_model: str = "text-embedding-3-large"

    @field_validator("cors_allowed_origins", mode="before")
    @classmethod
    def parse_cors_allowed_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
