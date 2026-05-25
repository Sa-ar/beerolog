import pytest

from app.models.flavor import FlavorVector
from app.services.challenge_service import (
    ChallengeExpiredError,
    compare_vectors,
    create_challenge_token,
    resolve_challenge_token,
)

SECRET = "test-secret"
LAGER = FlavorVector(
    bitterness=0.15,
    sweetness=0.1,
    fruitiness=0.1,
    roast=0.0,
    sourness=0.0,
    body=0.2,
    adventure=0.15,
)
STOUT = FlavorVector(
    bitterness=0.45,
    sweetness=0.35,
    fruitiness=0.1,
    roast=0.95,
    sourness=0.0,
    body=0.9,
    adventure=0.3,
)


def test_challenge_token_round_trips_challenger_id():
    token = create_challenge_token("user-42", SECRET)
    assert resolve_challenge_token(token, SECRET) == "user-42"


def test_expired_challenge_token_raises():
    token = create_challenge_token("user-42", SECRET, ttl_seconds=-1)
    with pytest.raises(ChallengeExpiredError):
        resolve_challenge_token(token, SECRET)


def test_identical_vectors_have_similarity_one():
    result = compare_vectors(LAGER, LAGER)
    assert abs(result.similarity - 1.0) < 0.01
    assert result.different == []


def test_opposite_vectors_have_low_similarity_and_differences():
    result = compare_vectors(LAGER, STOUT)
    assert result.similarity < 0.9
    assert len(result.different) > 0


def test_shared_dims_identified_when_both_agree():
    # Both have low sourness (0.0) — should appear in shared
    result = compare_vectors(LAGER, STOUT)
    assert "sourness" in result.shared


def test_different_dims_flagged_when_vectors_diverge():
    result = compare_vectors(LAGER, STOUT)
    # roast: LAGER=0.0, STOUT=0.95 — should be flagged
    assert "roast" in result.different
