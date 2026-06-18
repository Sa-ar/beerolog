from beerolog_icon_service.taste_profile import resolve_taste_profile_icon_requests


def test_resolve_requests_is_deterministic() -> None:
    dials = {
        "bubbles": 0.5,
        "bitterness": 0.7,
        "flavor_family": {
            "malty": 0.3,
            "hoppy": 0.9,
            "roasty": 0.8,
            "fruity": 0.2,
            "sour": 0.4,
            "smoky": 0.6,
        },
        "novelty_affinity": 0.85,
    }

    first = resolve_taste_profile_icon_requests(**dials)
    second = resolve_taste_profile_icon_requests(**dials)

    assert first == second
    assert first[0].purpose == "taste-profile:hero:hoppy+roasty"
    assert first[0].slot == "hero"
    assert [r.purpose for r in first[1:]] == [
        "taste-profile:flavor:hoppy",
        "taste-profile:flavor:roasty",
        "taste-profile:flavor:smoky",
        "taste-profile:flavor:sour",
    ]


def test_hero_purpose_uses_dominant_and_runner_up() -> None:
    requests = resolve_taste_profile_icon_requests(
        bubbles=0.5,
        bitterness=0.5,
        flavor_family={"malty": 0.9, "hoppy": 0.85, "roasty": 0.1, "fruity": 0.1, "sour": 0.1, "smoky": 0.1},
        novelty_affinity=0.2,
    )
    assert requests[0].purpose == "taste-profile:hero:malty+hoppy"


def test_hero_description_uses_concise_template() -> None:
    requests = resolve_taste_profile_icon_requests(
        bubbles=0.5,
        bitterness=0.7,
        flavor_family={
            "malty": 0.3,
            "hoppy": 0.9,
            "roasty": 0.8,
            "fruity": 0.2,
            "sour": 0.4,
            "smoky": 0.6,
        },
        novelty_affinity=0.85,
    )
    assert requests[0].description == (
        "Profile icon: hoppy+roasty, flavor explorer. 32×32 beer line-art."
    )
