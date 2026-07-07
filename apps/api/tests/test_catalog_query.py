"""Unit tests for the shared catalog query helpers."""

from __future__ import annotations

from app.services.catalog_query import recommend_from_text, search_catalog
from app.services.match_engine import BeerCandidate


def _beer(id_: str, name: str, brewery: str, style: str, abv: float, vec: list[float]):
    return BeerCandidate(
        id=id_,
        name=name,
        name_hebrew=None,
        brewery=brewery,
        style=style,
        abv=abv,
        market_tier="craft",
        color="gold",
        image_url=None,
        adventurousness=0.5,
        embedding=vec,
    )


CATALOG = [
    _beer("hazy", "Hazy IPA", "Alexander", "IPA", 6.5, [1.0, 0.0]),
    _beer("lager", "Golden Lager", "Goldstar", "Lager", 4.5, [0.0, 1.0]),
    _beer("stout", "Dry Stout", "Malka", "Stout", 7.0, [0.7, 0.7]),
]


def test_search_by_style():
    assert [b.id for b in search_catalog(CATALOG, style="ipa")] == ["hazy"]


def test_search_by_abv_band():
    assert [b.id for b in search_catalog(CATALOG, max_abv=5.0)] == ["lager"]


def test_search_free_text_matches_brewery():
    assert [b.id for b in search_catalog(CATALOG, q="malka")] == ["stout"]


def test_search_limit_caps_results():
    assert len(search_catalog(CATALOG, limit=2)) == 2


class _FakeEmbed:
    def __init__(self, vec: list[float]) -> None:
        self._vec = vec

    async def embed(self, text: str) -> list[float]:
        return self._vec


async def test_recommend_from_text_ranks_by_similarity():
    # Query vector aligned with the lager embedding -> lager ranks first.
    results = await recommend_from_text(_FakeEmbed([0.0, 1.0]), CATALOG, "crisp and clean", limit=1)
    assert results[0].beer.id == "lager"
