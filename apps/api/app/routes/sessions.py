from fastapi import APIRouter, Depends, HTTPException

from app.api_contracts import (
    CreateSessionRequest,
    CreateSessionResponse,
    GroupRecommendationResponse,
    JoinSessionRequest,
    JoinSessionResponse,
    OkResponse,
    SessionParticipantStatus,
    SessionStatusResponse,
    SubmitVectorRequest,
)
from app.dependencies import get_session_repo
from app.services.group_session import (
    SessionExpiredError,
    SessionNotFoundError,
    create_session,
    get_group_recommendation,
    get_status,
    join_session,
    submit_vector,
)

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post(
    "",
    response_model=CreateSessionResponse,
    operation_id="createSession",
)
async def create(
    body: CreateSessionRequest, repo=Depends(get_session_repo)
) -> CreateSessionResponse:
    session = await create_session(repo, host_id=body.host_id)
    return CreateSessionResponse(
        session_id=session.id,
        expires_at=session.expires_at.isoformat(),
    )


@router.post(
    "/{session_id}/join",
    response_model=JoinSessionResponse,
    operation_id="joinSession",
)
async def join(
    session_id: str,
    body: JoinSessionRequest,
    repo=Depends(get_session_repo),
) -> JoinSessionResponse:
    try:
        participant = await join_session(repo, session_id, name=body.name)
    except SessionExpiredError:
        raise HTTPException(status_code=410, detail="Session has expired")
    except SessionNotFoundError:
        raise HTTPException(status_code=404, detail="Session not found")
    return JoinSessionResponse(participant_id=participant.id)


@router.post(
    "/{session_id}/submit",
    response_model=OkResponse,
    operation_id="submitSessionVector",
)
async def submit(
    session_id: str,
    body: SubmitVectorRequest,
    repo=Depends(get_session_repo),
) -> OkResponse:
    try:
        await submit_vector(repo, session_id, body.participant_id, body.vector)
    except SessionNotFoundError:
        raise HTTPException(status_code=404, detail="Session not found")
    return OkResponse(ok=True)


@router.get(
    "/{session_id}/status",
    response_model=SessionStatusResponse,
    operation_id="getSessionStatus",
)
async def status(session_id: str, repo=Depends(get_session_repo)) -> SessionStatusResponse:
    try:
        result = await get_status(repo, session_id)
    except SessionNotFoundError:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionStatusResponse(
        session_id=result["session_id"],
        total=result["total"],
        completed=result["completed"],
        participants=[
            SessionParticipantStatus(**participant) for participant in result["participants"]
        ],
    )


@router.get(
    "/{session_id}/recommend",
    response_model=GroupRecommendationResponse,
    operation_id="getGroupRecommendation",
)
async def recommend(
    session_id: str,
    repo=Depends(get_session_repo),
) -> GroupRecommendationResponse:
    try:
        result = await get_group_recommendation(repo, session_id, beers=[])
    except SessionNotFoundError:
        raise HTTPException(status_code=404, detail="Session not found")
    return GroupRecommendationResponse(**result)
