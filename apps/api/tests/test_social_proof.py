import pytest

from app.services.social_proof import InMemorySocialRepo, get_friend_recommendations


@pytest.fixture
def repo():
    return InMemorySocialRepo()


@pytest.mark.asyncio
async def test_no_friends_returns_zero(repo):
    result = await get_friend_recommendations("user-1", beer_id="b1", venue_id="v1", repo=repo)
    assert result["count"] == 0
    assert result["names"] == []


@pytest.mark.asyncio
async def test_friend_who_liked_beer_at_venue_is_counted(repo):
    await repo.add_friend("user-1", friend_id="alice", friend_name="Alice")
    await repo.add_rating("alice", beer_id="b1", venue_id="v1", rating="liked", visible=True)

    result = await get_friend_recommendations("user-1", beer_id="b1", venue_id="v1", repo=repo)
    assert result["count"] == 1
    assert "Alice" in result["names"]


@pytest.mark.asyncio
async def test_rating_at_different_venue_not_counted(repo):
    await repo.add_friend("user-1", friend_id="alice", friend_name="Alice")
    await repo.add_rating("alice", beer_id="b1", venue_id="v-other", rating="liked", visible=True)

    result = await get_friend_recommendations("user-1", beer_id="b1", venue_id="v1", repo=repo)
    assert result["count"] == 0


@pytest.mark.asyncio
async def test_hidden_ratings_not_counted(repo):
    await repo.add_friend("user-1", friend_id="alice", friend_name="Alice")
    await repo.add_rating("alice", beer_id="b1", venue_id="v1", rating="liked", visible=False)

    result = await get_friend_recommendations("user-1", beer_id="b1", venue_id="v1", repo=repo)
    assert result["count"] == 0


@pytest.mark.asyncio
async def test_disliked_rating_not_counted(repo):
    await repo.add_friend("user-1", friend_id="alice", friend_name="Alice")
    await repo.add_rating("alice", beer_id="b1", venue_id="v1", rating="disliked", visible=True)

    result = await get_friend_recommendations("user-1", beer_id="b1", venue_id="v1", repo=repo)
    assert result["count"] == 0
