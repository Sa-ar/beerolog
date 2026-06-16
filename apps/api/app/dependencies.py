from typing import Protocol

from fastapi import HTTPException, status

from app.config import settings
from app.db import get_pool
from app.postgres_user_profile_repo import PostgresUserProfileRepo
from app.services.embedding_service import get_client as get_openai_client
from app.services.vision_service import OpenAILLMClient


class VenueRepo(Protocol):
    async def get_tap_list(self, venue_id: str) -> list[str]: ...
    async def set_tap_list(self, venue_id: str, beer_ids: list[str]) -> None: ...


class LLMClient(Protocol):
    async def extract_beer_names(self, image_base64: str) -> list[str]: ...


async def get_venue_repo() -> VenueRepo:
    # Replaced in tests via dependency_overrides; prod will inject DB-backed impl
    raise NotImplementedError


async def get_llm_client() -> LLMClient:
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OPENAI_API_KEY is not configured",
        )
    return OpenAILLMClient(get_openai_client())


async def get_session_repo():
    raise NotImplementedError


async def get_user_profile_repo():
    if not settings.database_url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="DATABASE_URL is not configured",
        )
    return PostgresUserProfileRepo(await get_pool())


async def get_leaderboard_repo():
    raise NotImplementedError
