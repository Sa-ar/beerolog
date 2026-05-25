import pytest
from app.services.user_profile_service import (
    get_profile,
    save_profile,
    add_to_history,
    get_history,
    InMemoryUserProfileRepo,
)

VECTOR = [0.2, 0.15, 0.1, 0.0, 0.0, 0.25, 0.15]


@pytest.fixture
def repo():
    return InMemoryUserProfileRepo()


@pytest.mark.asyncio
async def test_get_profile_returns_none_for_unknown_user(repo):
    result = await get_profile(repo, 'unknown-user')
    assert result is None


@pytest.mark.asyncio
async def test_save_and_get_profile_round_trips_vector(repo):
    await save_profile(repo, 'user-1', VECTOR)
    result = await get_profile(repo, 'user-1')
    assert result == VECTOR


@pytest.mark.asyncio
async def test_add_and_get_history_returns_entry(repo):
    await add_to_history(repo, 'user-1', beer_id='b1', rating='liked')
    history = await get_history(repo, 'user-1')
    assert len(history) == 1
    assert history[0]['beer_id'] == 'b1'
    assert history[0]['rating'] == 'liked'


@pytest.mark.asyncio
async def test_get_history_for_unknown_user_returns_empty(repo):
    history = await get_history(repo, 'nobody')
    assert history == []
