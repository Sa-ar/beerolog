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


def test_cors_origins_split_from_csv() -> None:
    s = Settings(cors_allowed_origins="http://a.test,http://b.test")  # type: ignore[arg-type]
    assert s.cors_allowed_origins == ["http://a.test", "http://b.test"]


def test_preview_env_allows_vercel_preview_origins() -> None:
    s = Settings(app_env="preview")  # type: ignore[arg-type]
    regex = s.effective_cors_origin_regex
    assert regex is not None
    assert re.match(
        regex,
        "https://beerolog-git-tech-debt-react-que-deaf43-saars-projects-d2973f9d.vercel.app",
    )


def test_preview_regex_rejects_foreign_origin() -> None:
    s = Settings(app_env="preview")  # type: ignore[arg-type]
    assert not re.match(s.effective_cors_origin_regex or "", "https://evil.example.com")


def test_production_has_no_implicit_origin_regex() -> None:
    assert Settings(app_env="production").effective_cors_origin_regex is None  # type: ignore[arg-type]


def test_explicit_origin_regex_overrides_preview_default() -> None:
    s = Settings(app_env="preview", cors_allowed_origin_regex=r"^https://example\.test$")  # type: ignore[arg-type]
    assert s.effective_cors_origin_regex == r"^https://example\.test$"
