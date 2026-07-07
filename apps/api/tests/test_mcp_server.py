"""Tests for the MCP tools: they shim the REST routes and forward the bearer.

The tool functions are plain coroutines after @mcp.tool(), so we call them
directly. Each drives the app via the in-process ASGI transport in _call, so
these are true end-to-end shim tests over dependency-overridden routes.
"""

from __future__ import annotations

from types import SimpleNamespace

import httpx  # type: ignore[import-not-found]
import pytest  # type: ignore[import-not-found]

from app import mcp_server
from app.dependencies import get_deck_catalog, get_taste_feedback_service
from app.main import app
from app.routes.public_catalog import _embedding_client_dep
from app.services.match_engine import BeerCandidate


def _beer(i: int, *, style: str = "Lager", abv: float = 5.0, vec: list[float]) -> BeerCandidate:
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
    )


CATALOG = [
    _beer(0, style="IPA", abv=6.5, vec=[1.0, 0.0]),
    _beer(1, style="Lager", abv=4.2, vec=[0.0, 1.0]),
]


class _FakeEmbed:
    async def embed(self, text: str) -> list[float]:
        return [0.0, 1.0]  # aligned with the lager


def _ctx(token: str | None):
    """Duck-typed stand-in for an MCP Context carrying request headers."""
    headers = {"authorization": token} if token else {}
    request = SimpleNamespace(headers=headers)
    return SimpleNamespace(request_context=SimpleNamespace(request=request))


@pytest.fixture(autouse=True)
def _wire():
    app.dependency_overrides[get_deck_catalog] = lambda: CATALOG
    app.dependency_overrides[_embedding_client_dep] = lambda: _FakeEmbed()
    yield
    for dep in (get_deck_catalog, _embedding_client_dep):
        app.dependency_overrides.pop(dep, None)


# --- auth-header forwarding (unit) -----------------------------------------


def test_auth_headers_forwards_bearer():
    assert mcp_server._auth_headers(_ctx("Bearer abc")) == {"authorization": "Bearer abc"}


def test_auth_headers_empty_without_token():
    assert mcp_server._auth_headers(_ctx(None)) == {}


# --- public tools shim the REST routes -------------------------------------


async def test_search_catalog_tool_filters_by_abv():
    hits = await mcp_server.search_catalog(max_abv=5.0)
    assert [b["id"] for b in hits] == ["b1"]


async def test_recommend_beers_tool_ranks_by_similarity():
    out = await mcp_server.recommend_beers("crisp lager", limit=1)
    assert out["results"][0]["beer"]["id"] == "b1"


async def test_get_beer_tool_returns_beer():
    assert (await mcp_server.get_beer("b0"))["id"] == "b0"


async def test_get_beer_tool_raises_on_missing():
    with pytest.raises(httpx.HTTPStatusError) as exc:
        await mcp_server.get_beer("nope")
    assert exc.value.response.status_code == 404


# --- user-scoped tools forward the bearer + enforce auth -------------------


class _Row:
    id = "r1"
    beer_id = "b0"
    beer_name = "Beer 0"
    beer_brewery = "Brew"
    rating = "loved"
    note = None
    created_at = "2026-07-04T00:00:00+00:00"


class _RatingsRepo:
    async def beer_exists(self, beer_id: str) -> bool:
        return beer_id == "b0"

    async def upsert_rating(self, *, user_id, beer_id, rating, note):
        return _Row()


class _Feedback:
    async def apply(self, *, user_id, beer_id, rating) -> None:
        pass


async def test_submit_rating_tool_records_for_authed_user():
    from app.auth import get_current_user
    from app.routes.ratings import get_ratings_repo

    app.dependency_overrides[get_current_user] = lambda: {"sub": "u1"}
    app.dependency_overrides[get_ratings_repo] = lambda: _RatingsRepo()
    app.dependency_overrides[get_taste_feedback_service] = lambda: _Feedback()
    try:
        out = await mcp_server.submit_rating(_ctx("Bearer x"), beer_id="b0", rating="loved")
        assert out["beer_id"] == "b0"
        assert out["rating"] == "loved"
    finally:
        for dep in (get_current_user, get_ratings_repo, get_taste_feedback_service):
            app.dependency_overrides.pop(dep, None)


async def test_user_tool_without_bearer_is_rejected():
    # No get_current_user override -> real auth rejects the (absent) forwarded token.
    with pytest.raises(httpx.HTTPStatusError) as exc:
        await mcp_server.list_my_ratings(_ctx(None))
    assert exc.value.response.status_code == 401
