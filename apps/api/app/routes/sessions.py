from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.dependencies import get_session_repo
from app.services.group_session import (
    create_session,
    join_session,
    submit_vector,
    get_status,
    get_group_recommendation,
    SessionExpiredError,
    SessionNotFoundError,
)

router = APIRouter(prefix='/sessions', tags=['sessions'])


class CreateSessionRequest(BaseModel):
    host_id: str


class JoinSessionRequest(BaseModel):
    name: str


class SubmitVectorRequest(BaseModel):
    participant_id: str
    vector: list[float]


@router.post('')
async def create(body: CreateSessionRequest, repo=Depends(get_session_repo)):
    session = await create_session(repo, host_id=body.host_id)
    return {'session_id': session.id, 'expires_at': session.expires_at.isoformat()}


@router.post('/{session_id}/join')
async def join(session_id: str, body: JoinSessionRequest, repo=Depends(get_session_repo)):
    try:
        participant = await join_session(repo, session_id, name=body.name)
    except SessionExpiredError:
        raise HTTPException(status_code=410, detail='Session has expired')
    except SessionNotFoundError:
        raise HTTPException(status_code=404, detail='Session not found')
    return {'participant_id': participant.id}


@router.post('/{session_id}/submit')
async def submit(session_id: str, body: SubmitVectorRequest, repo=Depends(get_session_repo)):
    try:
        await submit_vector(repo, session_id, body.participant_id, body.vector)
    except SessionNotFoundError:
        raise HTTPException(status_code=404, detail='Session not found')
    return {'ok': True}


@router.get('/{session_id}/status')
async def status(session_id: str, repo=Depends(get_session_repo)):
    try:
        return await get_status(repo, session_id)
    except SessionNotFoundError:
        raise HTTPException(status_code=404, detail='Session not found')


@router.get('/{session_id}/recommend')
async def recommend(session_id: str, repo=Depends(get_session_repo)):
    try:
        return await get_group_recommendation(repo, session_id, beers=[])
    except SessionNotFoundError:
        raise HTTPException(status_code=404, detail='Session not found')
