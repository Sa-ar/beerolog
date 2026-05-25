from typing import Protocol


class VenueRepo(Protocol):
    async def get_tap_list(self, venue_id: str) -> list[str]: ...
    async def set_tap_list(self, venue_id: str, beer_ids: list[str]) -> None: ...


class LLMClient(Protocol):
    async def extract_beer_names(self, image_base64: str) -> list[str]: ...


async def get_venue_repo() -> VenueRepo:
    # Replaced in tests via dependency_overrides; prod will inject DB-backed impl
    raise NotImplementedError


async def get_llm_client() -> LLMClient:
    raise NotImplementedError


async def get_session_repo():
    raise NotImplementedError


async def get_user_profile_repo():
    raise NotImplementedError


async def get_leaderboard_repo():
    raise NotImplementedError
