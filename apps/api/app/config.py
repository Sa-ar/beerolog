from functools import lru_cache
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Vercel preview URLs for the beerolog web project (team slug
# saars-projects-d2973f9d), e.g.
# https://beerolog-git-<branch>-<hash>-saars-projects-d2973f9d.vercel.app
VERCEL_PREVIEW_ORIGIN_REGEX = r"^https://beerolog-[a-z0-9-]+-saars-projects-d2973f9d\.vercel\.app$"


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
    # Optional regex of browser origins allowed to call the API, in addition to
    # cors_allowed_origins. Overrides the built-in Vercel preview-URL default.
    cors_allowed_origin_regex: str = ""
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"

    # Taste-profile matcher knobs (PRD: taste-profile-matcher.md)
    match_alpha: float = 0.6
    # Baseline weight when a session intent is present (lower → session matters more)
    match_session_alpha: float = 0.4
    match_beta: float = 0.3
    # Bonus/penalty applied when beer ABV matches/mismatches session abv_intent
    match_abv_weight: float = 0.15
    # Penalty for beers strong in a flavor family the user rates below neutral
    # (research: docs/quiz-roasted-dislike-research.md). Soft, graded, capped.
    match_avoid_weight: float = 0.4
    match_avoid_neutral: float = 0.35
    # Affine rescaling anchors for user-facing match % (probe: probe_cosine_calibration)
    match_cos_floor: float = 0.20
    match_cos_ceiling: float = 0.50
    baseline_staleness_days: int = 7
    # Rating feedback loop (PRD: beer-rating-feedback.md). All first-guess; tune
    # against the persona harness. lr = learning rate for the embedding nudge.
    nudge_base_lr: float = 0.08
    nudge_cold_start_factor: float = 2.0  # boost for the first <5 ratings
    nudge_lr_after_20: float = 0.04
    nudge_lr_after_50: float = 0.02
    nudge_per_rating_cap: float = 0.04  # max cosine-distance move per rating
    deck_size: int = 12  # cards returned by GET /rate/deck
    deck_catalog_ttl_seconds: float = 600  # in-process catalog cache lifetime
    # NoteAnalyzer (slice 6): LLM model + per-rating dial-delta cap.
    note_model: str = "gpt-4o-mini"
    note_dial_delta_cap: float = 0.05
    note_min_chars: int = 8
    # Blend weight for the note-derived (dials) embedding vs the nudged one.
    note_embedding_blend: float = 0.5
    # Guest preview (public, OpenAI-free): how many results are unlocked before
    # sign-up, and how many to score/return from the dial-space matcher.
    guest_unlocked_count: int = 3
    guest_top_k: int = 12
    embedding_model: str = "text-embedding-3-large"
    icon_model: str = "gpt-4o-mini"
    persona_model: str = "gpt-4o-mini"
    # Batched why-line explanations on POST /recommendations.
    why_model: str = "gpt-4o-mini"
    why_timeout_seconds: float = 4.0
    # PostHog LLM observability ($ai_generation events on OpenAI calls). Unset =
    # off (falls back to the plain OpenAI client). Reuses the web project token.
    posthog_project_token: str = ""
    posthog_host: str = "https://us.i.posthog.com"

    @field_validator("cors_allowed_origins", mode="before")
    @classmethod
    def parse_cors_allowed_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @property
    def effective_cors_origin_regex(self) -> str:
        """Regex of allowed origins passed to CORSMiddleware. An explicit
        CORS_ALLOWED_ORIGIN_REGEX wins; otherwise this project's Vercel preview
        URLs are allowed in every environment so per-commit preview domains work
        without manual config. The pattern is scoped to this project's Vercel org
        (only the team can deploy there), so it can't match an attacker origin."""
        return self.cors_allowed_origin_regex or VERCEL_PREVIEW_ORIGIN_REGEX


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
