"""Non-development runtime safety checks (issue #45).

In preview and production, missing or unsafe configuration must **fail
fast at startup**, not silently degrade at first request. Development
keeps the lax behaviour so localhost work is friction-free.

The checks run inside the FastAPI lifespan; raising any exception there
prevents the app from accepting traffic.
"""

from __future__ import annotations

from app.config import Settings
from app.errors import ConfigError

_REQUIRED_SECRETS: tuple[str, ...] = (
    "database_url",
    "openai_api_key",
    "clerk_secret_key",
    "clerk_publishable_key",
)


def enforce_non_development_safety(settings: Settings) -> None:
    """Raise `ConfigError` if any preview/production safety rule is violated.

    Rules:
      1. Every required secret (`DATABASE_URL`, `OPENAI_API_KEY`,
         `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`) must be present.
      2. `API_SECRET` must not be the literal dev default.
      3. `CORS_ALLOWED_ORIGINS` must be an explicit list — no wildcards
         (`*`, `*.example.com`), no protocol-less entries, no empty list.
    """

    if settings.app_env == "development":
        return

    problems: list[str] = []

    for name in _REQUIRED_SECRETS:
        if not getattr(settings, name):
            problems.append(f"{name.upper()} missing")

    if settings.api_secret == "dev-secret":
        problems.append("API_SECRET is still the dev default")

    origin_problem = _validate_origins(settings.cors_allowed_origins)
    if origin_problem:
        problems.append(origin_problem)

    if problems:
        raise ConfigError(
            f"non-development runtime safety failed in env={settings.app_env}: "
            + "; ".join(problems)
        )


def _validate_origins(origins: list[str]) -> str | None:
    if not origins:
        return "CORS_ALLOWED_ORIGINS must declare at least one origin"
    for origin in origins:
        if "*" in origin:
            return f"CORS_ALLOWED_ORIGINS contains wildcard ({origin!r})"
        if not (origin.startswith("http://") or origin.startswith("https://")):
            return f"CORS_ALLOWED_ORIGINS entry missing protocol ({origin!r})"
    return None
