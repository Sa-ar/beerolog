from fastapi import APIRouter, Depends

from app.api_contracts import (
    AddHistoryRequest,
    HistoryEntry,
    HistoryResponse,
    OkResponse,
    PersonaResponse,
    PersonaSummary,
    ProfileResponse,
    RateBeerRequest,
    SaveProfileRequest,
    UpdatedVectorResponse,
)
from app.auth import get_current_user
from app.dependencies import get_user_profile_repo
from app.models.flavor import FlavorVector
from app.services.feedback_service import apply_rating
from app.services.persona_service import classify_persona
from app.services.user_profile_service import (
    add_to_history,
    get_history,
    get_profile,
    save_profile,
)

router = APIRouter(prefix="/users", tags=["users"])


@router.get(
    "/me/profile",
    response_model=ProfileResponse,
    operation_id="getMyProfile",
)
async def get_my_profile(
    user: dict = Depends(get_current_user),
    repo=Depends(get_user_profile_repo),
) -> ProfileResponse:
    vector = await get_profile(repo, user["sub"])
    return ProfileResponse(user_id=user["sub"], vector=vector)


@router.put(
    "/me/profile",
    response_model=ProfileResponse,
    operation_id="saveMyProfile",
)
async def save_my_profile(
    body: SaveProfileRequest,
    user: dict = Depends(get_current_user),
    repo=Depends(get_user_profile_repo),
) -> ProfileResponse:
    await save_profile(repo, user["sub"], body.vector)
    return ProfileResponse(user_id=user["sub"], vector=body.vector)


@router.get(
    "/me/history",
    response_model=HistoryResponse,
    operation_id="getMyHistory",
)
async def get_my_history(
    user: dict = Depends(get_current_user),
    repo=Depends(get_user_profile_repo),
) -> HistoryResponse:
    entries = await get_history(repo, user["sub"])
    return HistoryResponse(entries=[HistoryEntry(**e) for e in entries])


@router.post(
    "/me/history",
    response_model=OkResponse,
    status_code=201,
    operation_id="addToMyHistory",
)
async def add_to_my_history(
    body: AddHistoryRequest,
    user: dict = Depends(get_current_user),
    repo=Depends(get_user_profile_repo),
) -> OkResponse:
    await add_to_history(repo, user["sub"], body.beer_id, body.rating)
    return OkResponse(ok=True)


@router.get(
    "/me/persona",
    response_model=PersonaResponse,
    operation_id="getMyPersona",
)
async def get_my_persona(
    user: dict = Depends(get_current_user),
    repo=Depends(get_user_profile_repo),
) -> PersonaResponse:
    vector = await get_profile(repo, user["sub"])
    if vector is None:
        return PersonaResponse(persona=None)
    persona = classify_persona(FlavorVector.from_list(vector))
    return PersonaResponse(
        persona=PersonaSummary(
            id=persona.id,
            name=persona.name,
            icon=persona.icon,
            description=persona.description,
        )
    )


@router.post(
    "/me/rate",
    response_model=UpdatedVectorResponse,
    operation_id="rateMyBeer",
)
async def rate_beer(
    body: RateBeerRequest,
    user: dict = Depends(get_current_user),
    repo=Depends(get_user_profile_repo),
) -> UpdatedVectorResponse:
    updated = await apply_rating(repo, user["sub"], body.beer.model_dump(), body.rating)
    return UpdatedVectorResponse(updated_vector=updated)
