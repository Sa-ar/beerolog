import pytest
from datetime import datetime, timedelta, timezone
from app.services.group_session import (
    create_session,
    join_session,
    submit_vector,
    get_status,
    get_group_recommendation,
    SessionExpiredError,
    InMemorySessionRepo,
)

NEUTRAL = [0.5] * 7
LAGER_VECTOR = [0.2, 0.15, 0.1, 0.0, 0.0, 0.25, 0.15]
STOUT_VECTOR = [0.4, 0.3, 0.1, 0.9, 0.0, 0.8, 0.3]


@pytest.fixture
def repo():
    return InMemorySessionRepo()


@pytest.mark.asyncio
async def test_create_session_returns_id_and_expiry(repo):
    session = await create_session(repo, host_id='host-1')

    assert session.id
    assert session.host_id == 'host-1'
    assert session.expires_at > datetime.now(timezone.utc)


@pytest.mark.asyncio
async def test_join_session_records_participant(repo):
    session = await create_session(repo, host_id='host-1')
    participant = await join_session(repo, session.id, name='Alice')

    assert participant.id
    assert participant.name == 'Alice'
    status = await get_status(repo, session.id)
    assert status['total'] == 1
    assert status['completed'] == 0


@pytest.mark.asyncio
async def test_submit_vector_marks_participant_complete(repo):
    session = await create_session(repo, host_id='host-1')
    p = await join_session(repo, session.id, name='Bob')
    await submit_vector(repo, session.id, p.id, LAGER_VECTOR)

    status = await get_status(repo, session.id)
    assert status['completed'] == 1
    assert status['total'] == 1


@pytest.mark.asyncio
async def test_group_recommendation_aggregates_submitted_vectors(repo):
    session = await create_session(repo, host_id='host-1')
    p1 = await join_session(repo, session.id, 'Alice')
    p2 = await join_session(repo, session.id, 'Bob')
    await submit_vector(repo, session.id, p1.id, LAGER_VECTOR)
    await submit_vector(repo, session.id, p2.id, STOUT_VECTOR)

    result = await get_group_recommendation(repo, session.id, beers=[])

    gv = result['group_vector']
    assert len(gv) == 7
    # midpoint of lager + stout vectors
    assert abs(gv[0] - (LAGER_VECTOR[0] + STOUT_VECTOR[0]) / 2) < 0.01


@pytest.mark.asyncio
async def test_partial_completion_still_returns_recommendation(repo):
    session = await create_session(repo, host_id='host-1')
    p1 = await join_session(repo, session.id, 'Alice')
    await join_session(repo, session.id, 'Bob')  # Bob never submits
    await submit_vector(repo, session.id, p1.id, LAGER_VECTOR)

    result = await get_group_recommendation(repo, session.id, beers=[])
    assert result['group_vector'] == LAGER_VECTOR


@pytest.mark.asyncio
async def test_empty_session_returns_neutral_vector(repo):
    session = await create_session(repo, host_id='host-1')

    result = await get_group_recommendation(repo, session.id, beers=[])
    assert result['group_vector'] == NEUTRAL
    assert result['high_variance'] is False


@pytest.mark.asyncio
async def test_join_after_expiry_raises(repo):
    session = await create_session(repo, host_id='host-1')
    session.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    await repo.save(session)

    with pytest.raises(SessionExpiredError):
        await join_session(repo, session.id, 'Late arrival')
