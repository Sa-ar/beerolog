from unittest.mock import AsyncMock, MagicMock

import pytest  # type: ignore[import-not-found]
from fastapi import HTTPException  # type: ignore[import-not-found]

from app.config import settings
from app.dependencies import get_llm_client, get_user_profile_repo
from app.postgres_user_profile_repo import PostgresUserProfileRepo


@pytest.mark.asyncio
async def test_get_llm_client_returns_configured_openai_client(monkeypatch):
    openai_client = MagicMock()
    monkeypatch.setattr(settings, "openai_api_key", "test-key")
    monkeypatch.setattr("app.dependencies.get_openai_client", lambda: openai_client)

    client = await get_llm_client()

    assert client._client is openai_client


@pytest.mark.asyncio
async def test_get_llm_client_raises_when_api_key_missing(monkeypatch):
    monkeypatch.setattr(settings, "openai_api_key", "")

    with pytest.raises(HTTPException) as exc:
        await get_llm_client()

    assert exc.value.status_code == 503


@pytest.mark.asyncio
async def test_get_user_profile_repo_returns_postgres_repo(monkeypatch):
    pool = object()
    monkeypatch.setattr(settings, "database_url", "postgres://example")
    monkeypatch.setattr("app.dependencies.get_pool", AsyncMock(return_value=pool))

    repo = await get_user_profile_repo()

    assert isinstance(repo, PostgresUserProfileRepo)
    assert repo._pool is pool


@pytest.mark.asyncio
async def test_get_user_profile_repo_raises_when_database_missing(monkeypatch):
    monkeypatch.setattr(settings, "database_url", "")

    with pytest.raises(HTTPException) as exc:
        await get_user_profile_repo()

    assert exc.value.status_code == 503
