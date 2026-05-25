import pytest
from app.models.flavor import FlavorVector
from app.services.recommendation_service import score_beers, aggregate_group_vectors


def _beer(id: str, **dims) -> dict:
    fv = FlavorVector(**{"bitterness": 0.5, "sweetness": 0.5, "fruitiness": 0.5,
                         "roast": 0.5, "sourness": 0.5, "body": 0.5, "adventure": 0.5, **dims})
    return {"id": id, "name": id, "brewery": "test", "style": "lager", "flavor_vector": fv.to_list()}


LAGER = _beer("lager", bitterness=0.1, sweetness=0.2, fruitiness=0.1, roast=0.0, sourness=0.0, body=0.2)
IPA = _beer("ipa", bitterness=0.9, fruitiness=0.7, roast=0.1, sweetness=0.1, sourness=0.1, body=0.5)
STOUT = _beer("stout", roast=0.9, body=0.9, bitterness=0.5, sweetness=0.3, fruitiness=0.1, sourness=0.0)
SOUR = _beer("sour", sourness=0.9, fruitiness=0.7, bitterness=0.1, sweetness=0.2, roast=0.0, body=0.3)


def test_refreshing_light_vector_ranks_lager_first():
    taste = FlavorVector(bitterness=0.1, sweetness=0.2, fruitiness=0.1, roast=0.0,
                         sourness=0.0, body=0.2, adventure=0.5)
    results = score_beers(taste, [LAGER, IPA, STOUT, SOUR])
    assert results[0]["id"] == "lager"


def test_roasty_rich_vector_ranks_stout_first():
    taste = FlavorVector(bitterness=0.5, sweetness=0.3, fruitiness=0.1, roast=0.9,
                         sourness=0.0, body=0.9, adventure=0.8)
    results = score_beers(taste, [LAGER, IPA, STOUT, SOUR])
    assert results[0]["id"] == "stout"


def test_group_aggregation_midpoint():
    v1 = FlavorVector(bitterness=0.0, sweetness=0.0, fruitiness=0.0, roast=0.0,
                      sourness=0.0, body=0.0, adventure=0.0)
    v2 = FlavorVector(bitterness=1.0, sweetness=1.0, fruitiness=1.0, roast=1.0,
                      sourness=1.0, body=1.0, adventure=1.0)
    agg, high_var = aggregate_group_vectors([v1, v2])
    assert abs(agg.bitterness - 0.5) < 0.01
    assert high_var is True


def test_empty_group_returns_neutral():
    agg, high_var = aggregate_group_vectors([])
    assert agg.bitterness == 0.5
    assert high_var is False
