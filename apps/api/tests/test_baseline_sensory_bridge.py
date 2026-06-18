from app.api_contracts import BaselineTasteDials
from app.services.baseline_sensory_bridge import compose_baseline_sensory_bridge


def test_hop_head_profile_uses_onboarding_phrases() -> None:
    dials = BaselineTasteDials(
        bubbles=0.9,
        bitterness=0.95,
        flavor_family={
            "malty": 0.4,
            "hoppy": 0.7,
            "roasty": 0.8,
            "fruity": 0.3,
            "sour": 0.5,
            "smoky": 0.5,
        },
        novelty_affinity=0.85,
    )
    text = compose_baseline_sensory_bridge(dials)
    assert "espresso" in text
    assert "im gaz" in text
    assert "dark chocolate" in text
    assert "grapefruit juice" in text
    assert "new and intense" in text
