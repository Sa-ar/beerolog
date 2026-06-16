from app.config import Settings


def test_defaults_match_pivot_prd() -> None:
    s = Settings()
    assert s.match_alpha == 0.6
    assert s.match_beta == 0.3
    assert s.baseline_staleness_days == 7
    assert s.embedding_model == "text-embedding-3-large"


def test_cors_origins_split_from_csv() -> None:
    s = Settings(cors_allowed_origins="http://a.test,http://b.test")  # type: ignore[arg-type]
    assert s.cors_allowed_origins == ["http://a.test", "http://b.test"]
