import re

from app.config import Settings


def test_defaults_match_pivot_prd() -> None:
    s = Settings()
    assert s.match_alpha == 0.6
    assert s.match_session_alpha == 0.4
    assert s.match_beta == 0.3
    assert s.match_abv_weight == 0.15
    assert s.match_cos_floor == 0.20
    assert s.match_cos_ceiling == 0.50
    assert s.baseline_staleness_days == 7
    assert s.embedding_model == "text-embedding-3-large"
    assert s.why_model == "gpt-4o-mini"
    assert s.why_timeout_seconds == 4.0


def test_cors_origins_split_from_csv() -> None:
    s = Settings(cors_allowed_origins="http://a.test,http://b.test")  # type: ignore[arg-type]
    assert s.cors_allowed_origins == ["http://a.test", "http://b.test"]


def test_project_preview_origins_allowed_in_every_env() -> None:
    for env in ("development", "preview", "production"):
        s = Settings(app_env=env)  # type: ignore[arg-type]
        assert re.match(
            s.effective_cors_origin_regex,
            "https://beerolog-git-tech-debt-react-que-deaf43-saars-projects-d2973f9d.vercel.app",
        ), env


def test_preview_regex_rejects_foreign_origin() -> None:
    s = Settings(app_env="production")  # type: ignore[arg-type]
    assert not re.match(s.effective_cors_origin_regex, "https://evil.example.com")


def test_explicit_origin_regex_overrides_default() -> None:
    s = Settings(cors_allowed_origin_regex=r"^https://example\.test$")  # type: ignore[arg-type]
    assert s.effective_cors_origin_regex == r"^https://example\.test$"
