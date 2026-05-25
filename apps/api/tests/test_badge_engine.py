from app.models.flavor import FlavorVector
from app.services.badge_engine import (
    check_bar_explorer,
    check_expert_level,
    check_taste_evolution,
)

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


def test_bar_explorer_25_percent_milestone():
    badge = check_bar_explorer(tried=5, total=20)
    assert badge is not None
    assert badge.id == "bar_explorer_25"


def test_bar_explorer_100_percent_milestone():
    badge = check_bar_explorer(tried=20, total=20)
    assert badge is not None
    assert badge.id == "bar_explorer_100"


def test_bar_explorer_no_badge_below_threshold():
    badge = check_bar_explorer(tried=2, total=20)
    assert badge is None


def test_expert_level_5_milestone():
    badge = check_expert_level(friend_likes=5)
    assert badge is not None
    assert badge.id == "expert_5"


def test_expert_level_25_milestone():
    badge = check_expert_level(friend_likes=25)
    assert badge is not None
    assert badge.id == "expert_25"


def test_expert_level_no_badge_below_threshold():
    badge = check_expert_level(friend_likes=3)
    assert badge is None


def test_taste_evolution_badge_when_drift_exceeds_threshold():
    badge = check_taste_evolution(initial=LAGER, current=STOUT)
    assert badge is not None
    assert badge.id == "taste_evolution"


def test_taste_evolution_no_badge_when_drift_small():
    # Tiny nudge from LAGER
    slight = FlavorVector(
        bitterness=0.17,
        sweetness=0.12,
        fruitiness=0.1,
        roast=0.0,
        sourness=0.0,
        body=0.22,
        adventure=0.15,
    )
    badge = check_taste_evolution(initial=LAGER, current=slight)
    assert badge is None
