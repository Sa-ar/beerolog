from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Protocol

from app.models.flavor import FlavorVector

from .recommendation_service import aggregate_group_vectors

SESSION_TTL_HOURS = 4


class SessionExpiredError(Exception):
    pass


class SessionNotFoundError(Exception):
    pass


@dataclass
class SessionParticipant:
    id: str
    name: str
    vector: list[float] | None = None
    joined_at: datetime = field(default_factory=lambda: datetime.now(UTC))


@dataclass
class GroupSession:
    id: str
    host_id: str
    participants: list[SessionParticipant]
    created_at: datetime
    expires_at: datetime


class SessionRepo(Protocol):
    async def create(self, session: GroupSession) -> None: ...
    async def get(self, session_id: str) -> GroupSession | None: ...
    async def save(self, session: GroupSession) -> None: ...


class InMemorySessionRepo:
    def __init__(self) -> None:
        self._store: dict[str, GroupSession] = {}

    async def create(self, session: GroupSession) -> None:
        self._store[session.id] = session

    async def get(self, session_id: str) -> GroupSession | None:
        return self._store.get(session_id)

    async def save(self, session: GroupSession) -> None:
        self._store[session.id] = session


async def create_session(repo: SessionRepo, host_id: str) -> GroupSession:
    now = datetime.now(UTC)
    session = GroupSession(
        id=str(uuid.uuid4()),
        host_id=host_id,
        participants=[],
        created_at=now,
        expires_at=now + timedelta(hours=SESSION_TTL_HOURS),
    )
    await repo.create(session)
    return session


async def join_session(repo: SessionRepo, session_id: str, name: str) -> SessionParticipant:
    session = await repo.get(session_id)
    if session is None:
        raise SessionNotFoundError(session_id)
    if datetime.now(UTC) > session.expires_at:
        raise SessionExpiredError(session_id)
    participant = SessionParticipant(id=str(uuid.uuid4()), name=name)
    session.participants.append(participant)
    await repo.save(session)
    return participant


async def submit_vector(
    repo: SessionRepo, session_id: str, participant_id: str, vector: list[float]
) -> None:
    session = await repo.get(session_id)
    if session is None:
        raise SessionNotFoundError(session_id)
    for p in session.participants:
        if p.id == participant_id:
            p.vector = vector
            break
    await repo.save(session)


async def get_status(repo: SessionRepo, session_id: str) -> dict:
    session = await repo.get(session_id)
    if session is None:
        raise SessionNotFoundError(session_id)
    total = len(session.participants)
    completed = sum(1 for p in session.participants if p.vector is not None)
    return {
        "session_id": session_id,
        "total": total,
        "completed": completed,
        "participants": [
            {"id": p.id, "name": p.name, "submitted": p.vector is not None}
            for p in session.participants
        ],
    }


async def get_group_recommendation(repo: SessionRepo, session_id: str, beers: list) -> dict:
    session = await repo.get(session_id)
    if session is None:
        raise SessionNotFoundError(session_id)
    submitted = [
        FlavorVector.from_list(p.vector) for p in session.participants if p.vector is not None
    ]
    group_vector, high_variance = aggregate_group_vectors(submitted)
    return {"group_vector": group_vector.to_list(), "high_variance": high_variance}
