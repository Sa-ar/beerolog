"""Integration tests for the menu-scan REST surface."""

from __future__ import annotations

import pytest  # type: ignore[import-not-found]
from fastapi.testclient import TestClient  # type: ignore[import-not-found]

from app.auth import get_current_user
from app.dependencies import get_deck_catalog
from app.main import app
from app.routes.menu import _embedding_client_dep, _menu_chat_dep, _vision_client_dep
from app.routes.onboarding import get_baseline_taste_repo
from app.services.baseline_taste_repo import BaselineTasteSnapshot
from app.services.match_engine import BeerCandidate
from app.services.menu_chat import ChatReply


def _beer(bid: str, name: str, brewery: str, embedding: list[float]) -> BeerCandidate:
    return BeerCandidate(
        id=bid,
        name=name,
        name_hebrew=None,
        brewery=brewery,
        style="lager",
        abv=5.0,
        market_tier="craft",
        color="gold",
        image_url=None,
        adventurousness=0.5,
        embedding=embedding,
    )


# Guinness aligns with the baseline vector below; Heineken is orthogonal.
CATALOG = [
    _beer("1", "Guinness Draught", "Guinness", [1.0, 0.0]),
    _beer("2", "Heineken", "Heineken", [0.0, 1.0]),
]


class _FakeEmb:
    """Embedding client stub returning a fixed session vector."""

    def __init__(self, vec: list[float]) -> None:
        self._vec = vec

    async def embed(self, text: str) -> list[float]:
        return self._vec


class _FakeRepo:
    """Baseline-taste repo stub. `snapshot=None` models a user who hasn't onboarded."""

    def __init__(self, snapshot: BaselineTasteSnapshot | None) -> None:
        self._snapshot = snapshot

    async def get(self, user_id: str) -> BaselineTasteSnapshot | None:
        return self._snapshot


def _snapshot(embedding: list[float]) -> BaselineTasteSnapshot:
    return BaselineTasteSnapshot(
        user_id="u1",
        bubbles=0.5,
        bitterness=0.5,
        sweetness=0.5,
        body=0.5,
        abv_affinity=0.5,
        flavor_family={},
        novelty_affinity=0.5,
        embedding=embedding,
        embedding_fresh_at="2026-01-01T00:00:00",
        updated_at="2026-01-01T00:00:00",
    )


class _FakeLLM:
    """Vision-client stub returning a fixed extracted name list."""

    def __init__(self, names: list[str]) -> None:
        self._names = names

    async def extract_beer_names(self, image_base64: str) -> list[str]:
        return self._names


@pytest.fixture(autouse=True)
def _cleanup():
    yield
    for dep in (
        get_current_user,
        get_deck_catalog,
        _vision_client_dep,
        get_baseline_taste_repo,
        _embedding_client_dep,
    ):
        app.dependency_overrides.pop(dep, None)


def _client(names: list[str], baseline: list[float] | None = [1.0, 0.0]) -> TestClient:
    app.dependency_overrides[get_current_user] = lambda: {"sub": "u1"}
    app.dependency_overrides[get_deck_catalog] = lambda: CATALOG
    app.dependency_overrides[_vision_client_dep] = lambda: _FakeLLM(names)
    snap = _snapshot(baseline) if baseline is not None else None
    app.dependency_overrides[get_baseline_taste_repo] = lambda: _FakeRepo(snap)
    return TestClient(app)


def test_scan_matches_catalog_beers():
    r = _client(["Guinness Draught", "Heineken"]).post("/menu/scan", json={"image_base64": "img"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert {item["matched_id"] for item in body} == {"1", "2"}
    assert all(not item["needs_review"] for item in body)


def test_scan_ranks_pool_by_taste_and_enriches():
    # Baseline aligns with Guinness → it ranks first and carries the higher fit;
    # the canonical catalog name/brewery is filled in on matched rows.
    r = _client(["Heineken", "Guinness Draught"]).post("/menu/scan", json={"image_base64": "img"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert [item["matched_id"] for item in body] == ["1", "2"]  # best taste-fit first
    top = body[0]
    assert top["name"] == "Guinness Draught" and top["brewery"] == "Guinness"
    assert top["taste_fit"] > body[1]["taste_fit"]


def test_scan_session_intent_reorders_pool():
    # Baseline favors Guinness; the session vector favors Heineken -> with a
    # tonight's-direction, Heineken ranks first.
    client = _client(["Guinness Draught", "Heineken"])
    app.dependency_overrides[_embedding_client_dep] = lambda: _FakeEmb([0.0, 1.0])
    r = client.post(
        "/menu/scan",
        json={
            "image_base64": "img",
            "session": {"vibe": "refreshing", "abv_intent": "any"},
        },
    )
    assert r.status_code == 200, r.text
    assert [i["matched_id"] for i in r.json()] == ["2", "1"]


def test_scan_degrades_without_baseline():
    # No onboarding yet: scan still matches, just unranked.
    r = _client(["Guinness Draught"], baseline=None).post(
        "/menu/scan", json={"image_base64": "img"}
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body[0]["matched_id"] == "1"
    assert body[0]["taste_fit"] is None


def test_scan_includes_unknown_beer_unranked_without_key():
    # A beer not in our catalog is NEVER dropped: with no embedding client it
    # can't be taste-ranked, but it's still returned with its exact menu text.
    # Stub emb=None explicitly — a real key in .env would otherwise rank by name.
    client = _client(["Xyzzy Quantum Stout"])
    app.dependency_overrides[_embedding_client_dep] = lambda: None
    r = client.post("/menu/scan", json={"image_base64": "img"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert len(body) == 1
    assert body[0]["matched_id"] is None
    assert body[0]["name"] == "Xyzzy Quantum Stout"
    assert body[0]["taste_fit"] is None


def test_scan_ranks_unknown_beer_by_name():
    # Off-catalog beer gets a taste_fit from its name embedding — ranked, not
    # dropped, and never relabeled as a catalog beer.
    client = _client(["Tuborg Green"])
    app.dependency_overrides[_embedding_client_dep] = lambda: _FakeEmb([1.0, 0.0])
    r = client.post("/menu/scan", json={"image_base64": "img"})
    assert r.status_code == 200, r.text
    row = r.json()[0]
    assert row["matched_id"] is None
    assert row["name"] == "Tuborg Green"
    assert row["taste_fit"] is not None


def test_rank_orders_picked_beers_by_taste():
    # Baseline favors Guinness (id 2 aligns [1,0]); ask to rank both explicitly.
    app.dependency_overrides[get_current_user] = lambda: {"sub": "u1"}
    app.dependency_overrides[get_deck_catalog] = lambda: CATALOG
    app.dependency_overrides[get_baseline_taste_repo] = lambda: _FakeRepo(_snapshot([1.0, 0.0]))
    r = TestClient(app).post("/menu/rank", json={"beer_ids": ["2", "1"]})
    assert r.status_code == 200, r.text
    body = r.json()
    assert [i["matched_id"] for i in body] == ["1", "2"]  # best taste-fit first
    assert body[0]["name"] == "Guinness Draught"
    assert body[0]["taste_fit"] is not None


def test_rank_drops_unknown_ids():
    app.dependency_overrides[get_current_user] = lambda: {"sub": "u1"}
    app.dependency_overrides[get_deck_catalog] = lambda: CATALOG
    app.dependency_overrides[get_baseline_taste_repo] = lambda: _FakeRepo(_snapshot([1.0, 0.0]))
    r = TestClient(app).post("/menu/rank", json={"beer_ids": ["1", "does-not-exist"]})
    assert r.status_code == 200, r.text
    assert [i["matched_id"] for i in r.json()] == ["1"]


class _FakeChat:
    def __init__(self, reply: ChatReply) -> None:
        self._reply = reply

    async def converse(self, *, pool, messages) -> ChatReply:
        return self._reply


def test_chat_returns_grounded_reply():
    app.dependency_overrides[get_current_user] = lambda: {"sub": "u1"}
    # LLM cites one real id and one off-pool id; only the real one comes back.
    app.dependency_overrides[_menu_chat_dep] = lambda: _FakeChat(
        ChatReply(reply="Go with the Guinness.", beer_ids=["2", "nope"])
    )
    r = TestClient(app).post(
        "/menu/chat",
        json={
            "pool": [{"id": "1", "name": "Heineken"}, {"id": "2", "name": "Guinness"}],
            "messages": [{"role": "user", "content": "what's rich and dark?"}],
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["reply"] == "Go with the Guinness."
    assert body["beer_ids"] == ["2"]
    app.dependency_overrides.pop(_menu_chat_dep, None)


def test_chat_requires_auth():
    app.dependency_overrides[_menu_chat_dep] = lambda: _FakeChat(ChatReply(reply="", beer_ids=[]))
    r = TestClient(app).post(
        "/menu/chat",
        json={"pool": [], "messages": [{"role": "user", "content": "hi"}]},
    )
    assert r.status_code == 401
    app.dependency_overrides.pop(_menu_chat_dep, None)


def test_chat_503_without_openai_key(monkeypatch):
    from app.routes import menu as menu_module

    monkeypatch.setattr(menu_module.settings, "openai_api_key", "")
    app.dependency_overrides[get_current_user] = lambda: {"sub": "u1"}
    r = TestClient(app).post(
        "/menu/chat",
        json={"pool": [], "messages": [{"role": "user", "content": "hi"}]},
    )
    assert r.status_code == 503


def test_scan_requires_auth():
    # No auth override and no bearer header -> real get_current_user rejects.
    app.dependency_overrides[get_deck_catalog] = lambda: CATALOG
    app.dependency_overrides[_vision_client_dep] = lambda: _FakeLLM([])
    app.dependency_overrides[get_baseline_taste_repo] = lambda: _FakeRepo(None)
    r = TestClient(app).post("/menu/scan", json={"image_base64": "img"})
    assert r.status_code == 401


def test_scan_503_without_openai_key(monkeypatch):
    # Real vision dep runs; with no key it returns 503 rather than calling OpenAI.
    from app.routes import menu as menu_module

    monkeypatch.setattr(menu_module.settings, "openai_api_key", "")
    app.dependency_overrides[get_current_user] = lambda: {"sub": "u1"}
    app.dependency_overrides[get_deck_catalog] = lambda: CATALOG
    app.dependency_overrides[get_baseline_taste_repo] = lambda: _FakeRepo(None)
    r = TestClient(app).post("/menu/scan", json={"image_base64": "img"})
    assert r.status_code == 503
