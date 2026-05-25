import pytest
from app.services.persona_service import classify_persona, PERSONAS
from app.models.flavor import FlavorVector


def fv(**kwargs) -> FlavorVector:
    defaults = dict(bitterness=0.5, sweetness=0.5, fruitiness=0.5, roast=0.5, sourness=0.5, body=0.5, adventure=0.5)
    return FlavorVector(**{**defaults, **kwargs})


def test_light_lager_vector_is_easy_sipper():
    vector = fv(bitterness=0.15, sweetness=0.1, fruitiness=0.1, roast=0.0, sourness=0.0, body=0.2, adventure=0.15)
    persona = classify_persona(vector)
    assert persona.id == 'easy_sipper'


def test_high_bitterness_fruity_is_hop_head():
    vector = fv(bitterness=0.9, fruitiness=0.8, adventure=0.8, sourness=0.1, roast=0.1, body=0.5, sweetness=0.1)
    persona = classify_persona(vector)
    assert persona.id == 'hop_head'


def test_high_roast_full_body_is_dark_side():
    vector = fv(roast=0.95, body=0.9, sweetness=0.3, bitterness=0.4, fruitiness=0.1, sourness=0.0, adventure=0.3)
    persona = classify_persona(vector)
    assert persona.id == 'dark_side'


def test_high_sourness_is_sour_seeker():
    vector = fv(sourness=0.95, fruitiness=0.7, bitterness=0.05, roast=0.0, body=0.3, sweetness=0.2, adventure=0.5)
    persona = classify_persona(vector)
    assert persona.id == 'sour_seeker'


def test_neutral_vector_is_balanced():
    vector = fv()  # all 0.5
    persona = classify_persona(vector)
    assert persona.id == 'balanced'


def test_personas_list_has_ten_entries():
    assert len(PERSONAS) == 10


def test_all_personas_have_required_fields():
    for p in PERSONAS:
        assert p.id
        assert p.name
        assert p.icon
        assert p.description
        assert len(p.centroid) == 7


def test_classify_is_deterministic():
    vector = fv(bitterness=0.9, fruitiness=0.8, adventure=0.8, sourness=0.1, roast=0.1, body=0.5, sweetness=0.1)
    assert classify_persona(vector).id == classify_persona(vector).id
