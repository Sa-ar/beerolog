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
    # cors_allowed_origins. Lets preview deployments allow Vercel's per-commit
    # preview URLs without wildcarding the explicit production allowlist.
    cors_allowed_origin_regex: str = ""
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
    # Rating feedback loop (PRD: beer-rating-feedback.md). All first-guess; tune
    # against the persona harness. lr = learning rate for the embedding nudge.
    nudge_base_lr: float = 0.08
    nudge_cold_start_factor: float = 2.0  # boost for the first <5 ratings
    nudge_lr_after_20: float = 0.04
    nudge_lr_after_50: float = 0.02
    nudge_per_rating_cap: float = 0.04  # max cosine-distance move per rating
    deck_size: int = 12  # cards returned by GET /rate/deck
    # NoteAnalyzer (slice 6): LLM model + per-rating dial-delta cap.
    note_model: str = "gpt-4o-mini"
    note_dial_delta_cap: float = 0.05
    note_min_chars: int = 8
    # Blend weight for the note-derived (dials) embedding vs the nudged one.
    note_embedding_blend: float = 0.5
    # Availability confidence (ADR-0006): decay + visibility + per-source weights
    availability_half_life_days: float = 90.0
    availability_threshold: float = 0.3
    availability_weight_scrape: float = 1.0
    availability_weight_user: float = 0.6
    availability_weight_curated: float = 1.0
    # User-added pairings publish low (won't dominate; rise as others confirm)
    availability_weight_user_add: float = 0.4
    # Signals contributing below this are safe to compact (slice #167)
    availability_compaction_epsilon: float = 0.001
    # Unresolved flags at/above this hide a (beer, venue) pairing from reads
    availability_flag_hide_threshold: int = 2
    # Scraper (slice #161): public sources to ingest + match thresholds
    availability_scrape_sources: list[str] = []
    availability_link_threshold: float = 0.92
    availability_review_threshold: float = 0.80
    availability_venue_match_threshold: float = 0.88
    availability_venue_review_threshold: float = 0.70
    # Guest preview (public, OpenAI-free): how many results are unlocked before
    # sign-up, and how many to score/return from the dial-space matcher.
    guest_unlocked_count: int = 3
    guest_top_k: int = 12
    embedding_model: str = "text-embedding-3-large"
    icon_model: str = "gpt-4o-mini"
    persona_model: str = "gpt-4o-mini"

    @field_validator("availability_scrape_sources", "cors_allowed_origins", mode="before")
    @classmethod
    def parse_cors_allowed_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @property
    def effective_cors_origin_regex(self) -> str | None:
        """Regex of allowed origins passed to CORSMiddleware. An explicit
        CORS_ALLOWED_ORIGIN_REGEX wins; otherwise preview deployments auto-allow
        this project's Vercel preview URLs so per-commit preview domains work
        without manual config. Production never gets an implicit regex."""
        if self.cors_allowed_origin_regex:
            return self.cors_allowed_origin_regex
        if self.app_env == "preview":
            return VERCEL_PREVIEW_ORIGIN_REGEX
        return None


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
