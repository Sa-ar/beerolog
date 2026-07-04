from app.services.entity_resolution import (
    Dropped,
    Linked,
    NeedsReview,
    classify,
    normalize_name,
)

# Tiny 2-D "embeddings" — direction is all cosine cares about.
GOLDSTAR = ("goldstar", [1.0, 0.0])
ALEXANDER = ("alexander-black", [0.0, 1.0])
CATALOG = [GOLDSTAR, ALEXANDER]


def test_normalize_strips_volume_and_punctuation() -> None:
    assert normalize_name("אלכסנדר בלונד 500מל") == normalize_name("אלכסנדר בלונד")
    assert normalize_name("Lagunitas IPA, 6-pack") == "lagunitas ipa"


def test_high_similarity_links() -> None:
    result = classify([0.99, 0.14], CATALOG)  # ~aligned with goldstar
    assert isinstance(result, Linked)
    assert result.beer_id == "goldstar"


def test_mid_similarity_goes_to_review() -> None:
    # ~0.85 cosine with goldstar: above review (0.80), below link (0.92)
    result = classify([0.85, 0.527], CATALOG)
    assert isinstance(result, NeedsReview)
    assert result.beer_id == "goldstar"


def test_low_similarity_drops() -> None:
    result = classify([0.7, 0.7], CATALOG)  # ~0.71 with either
    assert isinstance(result, Dropped)


def test_empty_catalog_drops() -> None:
    assert isinstance(classify([1.0, 0.0], []), Dropped)
