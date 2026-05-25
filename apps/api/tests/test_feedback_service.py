import pytest
from app.services.feedback_service import apply_rating
from app.services.user_profile_service import InMemoryUserProfileRepo

LAGER_PROFILE = [0.2, 0.15, 0.1, 0.0, 0.0, 0.25, 0.15]
STOUT_BEER = {'id': 'b1', 'name': 'Guinness', 'style': 'stout', 'flavor_vector': [0.4, 0.3, 0.1, 0.9, 0.0, 0.8, 0.3]}


@pytest.fixture
async def repo_with_profile():
    repo = InMemoryUserProfileRepo()
    await repo.save_profile('user-1', list(LAGER_PROFILE))
    return repo


@pytest.mark.asyncio
async def test_loved_nudges_vector_toward_beer(repo_with_profile):
    await apply_rating(repo_with_profile, 'user-1', STOUT_BEER, 'loved')
    updated = await repo_with_profile.get_profile('user-1')
    # Each dim should move toward stout values (e.g. roast: 0.0 → closer to 0.9)
    assert updated is not None
    assert updated[3] > LAGER_PROFILE[3]  # roast moved up


@pytest.mark.asyncio
async def test_fine_leaves_vector_unchanged(repo_with_profile):
    await apply_rating(repo_with_profile, 'user-1', STOUT_BEER, 'fine')
    updated = await repo_with_profile.get_profile('user-1')
    assert updated == LAGER_PROFILE


@pytest.mark.asyncio
async def test_disliked_nudges_vector_away_from_beer(repo_with_profile):
    await apply_rating(repo_with_profile, 'user-1', STOUT_BEER, 'disliked')
    updated = await repo_with_profile.get_profile('user-1')
    assert updated is not None
    # roast (dim 3): profile=0.0, beer=0.9 -> clamped at 0.0, can't go lower
    assert updated[3] == 0.0
    # bitterness (dim 0): profile=0.2, beer=0.4 -> nudge away toward 0
    assert updated[0] < LAGER_PROFILE[0]


@pytest.mark.asyncio
async def test_disliked_records_style_suppression(repo_with_profile):
    await apply_rating(repo_with_profile, 'user-1', STOUT_BEER, 'disliked')
    suppressions = await repo_with_profile.get_suppressions('user-1')
    assert 'stout' in suppressions
    assert suppressions['stout'] > 0


@pytest.mark.asyncio
async def test_anonymous_user_returns_none():
    repo = InMemoryUserProfileRepo()
    result = await apply_rating(repo, 'anon-user', STOUT_BEER, 'loved')
    assert result is None


@pytest.mark.asyncio
async def test_all_ratings_recorded_in_history(repo_with_profile):
    await apply_rating(repo_with_profile, 'user-1', STOUT_BEER, 'loved')
    history = await repo_with_profile.get_history('user-1')
    assert len(history) == 1
    assert history[0]['beer_id'] == 'b1'
    assert history[0]['rating'] == 'loved'
