"""Integration tests for the public catalog REST surface."""

from __future__ import annotations

import pytest  # type: ignore[import-not-found]
from fastapi.testclient import TestClient  # type: ignore[import-not-found]

from app.dependencies import get_deck_catalog
from app.main import app
from app.routes.public_catalog import _embedding_client_dep
from app.services.match_engine import BeerCandidate


def _beer(
    i: int, *, style: str, abv: float, vec: list[float], ibu: int | None = None
) -> BeerCandidate:
    return BeerCandidate(
        id=f"b{i}",
        name=f"Beer {i}",
        name_hebrew=None,
        brewery="Brew",
        style=style,
        abv=abv,
        market_tier="craft",
        color="gold",
        image_url=None,
        adventurousness=0.5,
        embedding=vec,
        ibu=ibu,
    )


CATALOG = [
    _beer(0, style="IPA", abv=6.5, vec=[1.0, 0.0], ibu=65),
    _beer(1, style="Lager", abv=4.2, vec=[0.0, 1.0]),
]


class _FakeEmbed:
    async def embed(self, text: str) -> list[float]:
        return [0.0, 1.0]  # aligned with the lager


@pytest.fixture(autouse=True)
def _cleanup():
    yield
    for dep in (get_deck_catalog, _embedding_client_dep):
        app.dependency_overrides.pop(dep, None)


def _client() -> TestClient:
    app.dependency_overrides[get_deck_catalog] = lambda: CATALOG
    app.dependency_overrides[_embedding_client_dep] = lambda: _FakeEmbed()
    return TestClient(app)


def test_list_catalog_strips_embedding():
    r = _client().get("/catalog")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["total"] == 2
    assert {b["id"] for b in body["beers"]} == {"b0", "b1"}
    assert "embedding" not in body["beers"][0]


def test_get_beer_404():
    assert _client().get("/catalog/nope").status_code == 404


def test_get_beer_includes_ibu():
    """The detail view's bitterness axis needs ibu on the public catalog surface."""
    r = _client().get("/catalog/b0")
    assert r.status_code == 200, r.text
    assert r.json()["ibu"] == 65
    # nullable: a beer without ibu still serializes cleanly
    assert _client().get("/catalog/b1").json()["ibu"] is None


def test_search_by_abv():
    r = _client().get("/catalog/search", params={"max_abv": 5.0})
    assert r.status_code == 200, r.text
    assert [b["id"] for b in r.json()] == ["b1"]


def test_recommend_returns_ranked_with_why():
    r = _client().post("/catalog/recommend", json={"preference_text": "crisp lager", "limit": 1})
    assert r.status_code == 200, r.text
    results = r.json()["results"]
    assert results[0]["beer"]["id"] == "b1"
    assert "why" in results[0]
