"""Tests for the account (data-subject rights) routes.

Uses an in-memory AccountRepo + a fake Clerk dep override so the tests run
without a DB or a real Clerk session. The asyncpg impl's cascade SQL is only
exercised by integration tests against a live DB.
"""

from __future__ import annotations

import pytest  # type: ignore[import-not-found]
from fastapi.testclient import TestClient  # type: ignore[import-not-found]

from app.auth import get_current_user
from app.main import app
from app.routes.users import get_account_repo

FAKE_USER = {"sub": "user_test_123"}


class _MemoryAccountRepo:
    """Models the Beerolog-owned rows for a user as a single presence flag."""

    def __init__(self) -> None:
        self.deleted: list[str] = []
        self.data: dict[str, dict[str, object]] = {
            "user_test_123": {"baseline": True, "ratings": 3},
        }

    async def delete_account(self, *, user_id: str) -> None:
        self.deleted.append(user_id)
        self.data.pop(user_id, None)


@pytest.fixture
def repo() -> _MemoryAccountRepo:
    return _MemoryAccountRepo()


@pytest.fixture
def client(repo: _MemoryAccountRepo):
    app.dependency_overrides[get_account_repo] = lambda: repo
    app.dependency_overrides[get_current_user] = lambda: FAKE_USER
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_account_repo, None)
        app.dependency_overrides.pop(get_current_user, None)


def test_delete_me_removes_account_and_returns_signout_contract(
    client: TestClient, repo: _MemoryAccountRepo
) -> None:
    r = client.delete("/me")
    assert r.status_code == 200
    assert r.json() == {"deleted": True}
    assert repo.deleted == ["user_test_123"]
    assert "user_test_123" not in repo.data


def test_delete_me_requires_auth() -> None:
    raw_client = TestClient(app)
    r = raw_client.delete("/me")
    assert r.status_code == 401


def test_delete_me_logs_request_id_and_user_id(
    client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level("INFO"):
        client.delete("/me", headers={"X-Request-ID": "req-abc"})
    messages = " ".join(rec.getMessage() for rec in caplog.records)
    assert "user_test_123" in messages
    assert "req-abc" in messages
