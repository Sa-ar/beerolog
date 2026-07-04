"""ADR-0004 regression: a rating note round-trips through GET /me/export.

The note is personal data; activating the feedback loop must not drop it from
the data-subject export. (Deletion is covered by account_repo's explicit
DELETE FROM beer_ratings + cascade.)
"""

from __future__ import annotations

import pytest  # type: ignore[import-not-found]
from fastapi.testclient import TestClient  # type: ignore[import-not-found]

from app.auth import get_current_user
from app.main import app
from app.routes.users import get_account_repo
from app.services.account_repo import AccountExportData, ExportRatingData

FAKE_USER = {"sub": "user_export"}


class _AccountRepo:
    async def export_account(self, *, user_id: str) -> AccountExportData:
        return AccountExportData(
            id=user_id,
            email="taster@example.com",
            display_name=None,
            baseline_taste=None,
            ratings=[
                ExportRatingData(beer_id="goldstar", rating="disliked", note="too hoppy for me")
            ],
        )

    async def delete_account(self, *, user_id: str) -> None:
        return None


@pytest.fixture
def client() -> TestClient:
    app.dependency_overrides[get_account_repo] = lambda: _AccountRepo()
    app.dependency_overrides[get_current_user] = lambda: FAKE_USER
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_account_repo, None)
        app.dependency_overrides.pop(get_current_user, None)


def test_export_includes_rating_note(client: TestClient) -> None:
    r = client.get("/me/export")
    assert r.status_code == 200, r.text
    ratings = r.json()["ratings"]
    assert ratings[0]["note"] == "too hoppy for me"
    assert ratings[0]["rating"] == "disliked"
