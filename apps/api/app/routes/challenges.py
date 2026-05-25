from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import get_current_user
from app.config import settings
from app.dependencies import get_user_profile_repo
from app.models.flavor import FlavorVector
from app.services.challenge_service import (
    ChallengeExpiredError,
    compare_vectors,
    create_challenge_token,
    resolve_challenge_token,
)
from app.services.persona_service import classify_persona
from app.services.user_profile_service import get_profile

router = APIRouter(prefix="/challenges", tags=["challenges"])


@router.post("")
async def create_challenge(
    user: dict = Depends(get_current_user),
    repo=Depends(get_user_profile_repo),
) -> dict:
    token = create_challenge_token(user["sub"], settings.api_secret)
    return {"token": token}


class FriendVector(BaseModel):
    vector: list[float]


@router.post("/{token}/compare")
async def compare(
    token: str,
    body: FriendVector,
    repo=Depends(get_user_profile_repo),
) -> dict:
    try:
        challenger_id = resolve_challenge_token(token, settings.api_secret)
    except ChallengeExpiredError:
        raise HTTPException(status_code=410, detail="Challenge link has expired")

    challenger_vec = await get_profile(repo, challenger_id)
    if challenger_vec is None:
        raise HTTPException(status_code=404, detail="Challenger profile not found")

    challenger_fv = FlavorVector.from_list(challenger_vec)
    friend_fv = FlavorVector.from_list(body.vector)

    comparison = compare_vectors(challenger_fv, friend_fv)
    challenger_persona = classify_persona(challenger_fv)
    friend_persona = classify_persona(friend_fv)

    return {
        "similarity": comparison.similarity,
        "shared": comparison.shared,
        "different": comparison.different,
        "challenger_persona": {
            "id": challenger_persona.id,
            "name": challenger_persona.name,
            "icon": challenger_persona.icon,
        },
        "friend_persona": {
            "id": friend_persona.id,
            "name": friend_persona.name,
            "icon": friend_persona.icon,
        },
    }
