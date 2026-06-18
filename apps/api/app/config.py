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
    # Baseline weight when a session intent is present (lower → session matters more)
    match_session_alpha: float = 0.4
    match_beta: float = 0.3
    # Bonus/penalty applied when beer ABV matches/mismatches session abv_intent
    match_abv_weight: float = 0.15
    # Affine rescaling anchors for user-facing match % (probe: probe_cosine_calibration)
    match_cos_floor: float = 0.20
    match_cos_ceiling: float = 0.50
    baseline_staleness_days: int = 7
    embedding_model: str = "text-embedding-3-large"
    icon_model: str = "gpt-4o-mini"

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
