import pytest
from app.services.leaderboard import (
    get_leaderboard,
    InMemoryLeaderboardRepo,
    LeaderboardEntry,
)


@pytest.fixture
def repo():
    return InMemoryLeaderboardRepo()


@pytest.mark.asyncio
async def test_empty_venue_returns_empty_list(repo):
    result = await get_leaderboard(venue_id='v1', viewer_id='user-1', repo=repo)
    assert result['entries'] == []
    assert result['viewer_rank'] is None


@pytest.mark.asyncio
async def test_users_ranked_by_positive_count_descending(repo):
    await repo.set_user('alice', username='Alice', persona_icon='🌿')
    await repo.set_user('bob', username='Bob', persona_icon='🌊')
    await repo.add_rating('alice', venue_id='v1', rating='loved', visible=True)
    await repo.add_rating('alice', venue_id='v1', rating='loved', visible=True)
    await repo.add_rating('bob', venue_id='v1', rating='loved', visible=True)

    result = await get_leaderboard(venue_id='v1', viewer_id='carol', repo=repo)
    entries = result['entries']
    assert len(entries) == 2
    assert entries[0].user_id == 'alice'
    assert entries[0].rank == 1
    assert entries[1].user_id == 'bob'
    assert entries[1].rank == 2


@pytest.mark.asyncio
async def test_private_users_excluded_from_public_entries(repo):
    await repo.set_user('alice', username='Alice', persona_icon='🌿')
    await repo.set_user('bob', username='Bob', persona_icon='🌊')
    await repo.add_rating('alice', venue_id='v1', rating='loved', visible=False)
    await repo.add_rating('bob', venue_id='v1', rating='loved', visible=True)

    result = await get_leaderboard(venue_id='v1', viewer_id='carol', repo=repo)
    assert len(result['entries']) == 1
    assert result['entries'][0].user_id == 'bob'


@pytest.mark.asyncio
async def test_viewer_rank_included_even_when_private(repo):
    await repo.set_user('alice', username='Alice', persona_icon='🌿')
    await repo.set_user('viewer', username='Viewer', persona_icon='⚖️')
    await repo.add_rating('alice', venue_id='v1', rating='loved', visible=True)
    await repo.add_rating('alice', venue_id='v1', rating='loved', visible=True)
    await repo.add_rating('viewer', venue_id='v1', rating='loved', visible=False)

    result = await get_leaderboard(venue_id='v1', viewer_id='viewer', repo=repo)
    # Alice is rank 1 (public), viewer is rank 2 (private, but visible to themselves)
    assert result['viewer_rank'] == 2
    # Public entries should not include viewer
    assert all(e.user_id != 'viewer' for e in result['entries'])


@pytest.mark.asyncio
async def test_only_loved_ratings_count(repo):
    await repo.set_user('alice', username='Alice', persona_icon='🌿')
    await repo.add_rating('alice', venue_id='v1', rating='loved', visible=True)
    await repo.add_rating('alice', venue_id='v1', rating='fine', visible=True)
    await repo.add_rating('alice', venue_id='v1', rating='disliked', visible=True)

    result = await get_leaderboard(venue_id='v1', viewer_id='carol', repo=repo)
    assert result['entries'][0].recommendation_count == 1


@pytest.mark.asyncio
async def test_tied_users_share_rank(repo):
    await repo.set_user('alice', username='Alice', persona_icon='🌿')
    await repo.set_user('bob', username='Bob', persona_icon='🌊')
    await repo.add_rating('alice', venue_id='v1', rating='loved', visible=True)
    await repo.add_rating('bob', venue_id='v1', rating='loved', visible=True)

    result = await get_leaderboard(venue_id='v1', viewer_id='carol', repo=repo)
    ranks = {e.rank for e in result['entries']}
    assert ranks == {1}


@pytest.mark.asyncio
async def test_entry_includes_persona_icon(repo):
    await repo.set_user('alice', username='Alice', persona_icon='🌿')
    await repo.add_rating('alice', venue_id='v1', rating='loved', visible=True)

    result = await get_leaderboard(venue_id='v1', viewer_id='carol', repo=repo)
    assert result['entries'][0].persona_icon == '🌿'
    assert result['entries'][0].username == 'Alice'


@pytest.mark.asyncio
async def test_ratings_at_other_venues_not_counted(repo):
    await repo.set_user('alice', username='Alice', persona_icon='🌿')
    await repo.add_rating('alice', venue_id='v-other', rating='loved', visible=True)

    result = await get_leaderboard(venue_id='v1', viewer_id='carol', repo=repo)
    assert result['entries'] == []
