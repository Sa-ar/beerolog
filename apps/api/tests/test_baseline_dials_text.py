from app.api_contracts import BaselineTasteDials
from app.services.baseline_dials_text import dials_to_text


def test_dials_to_text_includes_flavor_weights() -> None:
    dials = BaselineTasteDials(
        bubbles=0.5,
        bitterness=0.45,
        flavor_family={
            "malty": 0.7,
            "hoppy": 0.3,
            "roasty": 0.3,
            "fruity": 0.3,
            "sour": 0.5,
            "smoky": 0.5,
        },
        novelty_affinity=0.15,
    )
    text = dials_to_text(dials)
    assert "malty (0.70)" in text
    assert "Flavor draw weights" in text


def test_dials_to_text_includes_cross_sensory_phrases() -> None:
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
    text = dials_to_text(dials)
    assert "espresso" in text
    assert "grapefruit juice" in text
    assert "im gaz" in text
