"""Tests for the non-development runtime safety enforcer (issue #45)."""

from __future__ import annotations

import pytest  # type: ignore[import-not-found]

from app.config import Settings
from app.errors import ConfigError
from app.startup_checks import enforce_non_development_safety


def _ok_settings(**overrides) -> Settings:
    defaults = dict(
        app_env="production",
        database_url="postgresql://user:pw@host/db",
        openai_api_key="sk-real-key",
        clerk_publishable_key="pk_live_x",
        clerk_secret_key="sk_live_x",
        api_secret="a-non-default-secret",
        cors_allowed_origins=["https://beerolog.example.com"],
    )
    defaults.update(overrides)
    return Settings(**defaults)


def test_development_skips_all_checks() -> None:
    enforce_non_development_safety(_ok_settings(app_env="development", database_url=""))


def test_production_with_full_config_passes() -> None:
    enforce_non_development_safety(_ok_settings())


def test_production_fails_on_missing_database_url() -> None:
    with pytest.raises(ConfigError, match="DATABASE_URL missing"):
        enforce_non_development_safety(_ok_settings(database_url=""))


def test_production_fails_on_missing_openai_key() -> None:
    with pytest.raises(ConfigError, match="OPENAI_API_KEY missing"):
        enforce_non_development_safety(_ok_settings(openai_api_key=""))


def test_production_fails_on_missing_clerk_keys() -> None:
    with pytest.raises(ConfigError, match="CLERK"):
        enforce_non_development_safety(_ok_settings(clerk_secret_key=""))


def test_production_fails_on_dev_api_secret() -> None:
    with pytest.raises(ConfigError, match="API_SECRET"):
        enforce_non_development_safety(_ok_settings(api_secret="dev-secret"))


def test_production_fails_on_wildcard_origin() -> None:
    with pytest.raises(ConfigError, match="wildcard"):
        enforce_non_development_safety(_ok_settings(cors_allowed_origins=["*"]))


def test_production_fails_on_subdomain_wildcard() -> None:
    with pytest.raises(ConfigError, match="wildcard"):
        enforce_non_development_safety(
            _ok_settings(cors_allowed_origins=["https://*.beerolog.example.com"])
        )


def test_production_fails_on_protocol_less_origin() -> None:
    with pytest.raises(ConfigError, match="protocol"):
        enforce_non_development_safety(_ok_settings(cors_allowed_origins=["beerolog.example.com"]))


def test_production_fails_on_empty_origins() -> None:
    with pytest.raises(ConfigError, match="at least one"):
        enforce_non_development_safety(_ok_settings(cors_allowed_origins=[]))


def test_production_reports_multiple_problems_in_one_error() -> None:
    with pytest.raises(ConfigError) as ei:
        enforce_non_development_safety(
            _ok_settings(database_url="", api_secret="dev-secret", openai_api_key="")
        )
    msg = str(ei.value)
    assert "DATABASE_URL missing" in msg
    assert "OPENAI_API_KEY missing" in msg
    assert "API_SECRET is empty or still the dev default" in msg


def test_production_rejects_empty_api_secret() -> None:
    with pytest.raises(ConfigError) as ei:
        enforce_non_development_safety(_ok_settings(api_secret=""))
    assert "API_SECRET is empty" in str(ei.value)


def test_preview_is_treated_the_same_as_production() -> None:
    with pytest.raises(ConfigError):
        enforce_non_development_safety(_ok_settings(app_env="preview", database_url=""))
