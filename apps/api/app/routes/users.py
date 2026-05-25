from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel

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


class ProfileResponse(BaseModel):
    user_id: str
    vector: list[float] | None


class SaveProfileRequest(BaseModel):
    vector: list[float]


class HistoryEntry(BaseModel):
    beer_id: str
    rating: str | None
    tried_at: str


class HistoryResponse(BaseModel):
    entries: list[HistoryEntry]


class AddHistoryRequest(BaseModel):
    beer_id: str
    rating: str | None = None


class RateRequest(BaseModel):
    beer: dict
    rating: Literal["loved", "fine", "disliked"]


@router.get("/me/profile", response_model=ProfileResponse)
async def get_my_profile(
    user: dict = Depends(get_current_user),
    repo=Depends(get_user_profile_repo),
) -> ProfileResponse:
    vector = await get_profile(repo, user["sub"])
    return ProfileResponse(user_id=user["sub"], vector=vector)


@router.put("/me/profile", response_model=ProfileResponse)
async def save_my_profile(
    body: SaveProfileRequest,
    user: dict = Depends(get_current_user),
    repo=Depends(get_user_profile_repo),
) -> ProfileResponse:
    await save_profile(repo, user["sub"], body.vector)
    return ProfileResponse(user_id=user["sub"], vector=body.vector)


@router.get("/me/history", response_model=HistoryResponse)
async def get_my_history(
    user: dict = Depends(get_current_user),
    repo=Depends(get_user_profile_repo),
) -> HistoryResponse:
    entries = await get_history(repo, user["sub"])
    return HistoryResponse(entries=[HistoryEntry(**e) for e in entries])


@router.post("/me/history", status_code=201)
async def add_to_my_history(
    body: AddHistoryRequest,
    user: dict = Depends(get_current_user),
    repo=Depends(get_user_profile_repo),
) -> dict:
    await add_to_history(repo, user["sub"], body.beer_id, body.rating)
    return {"ok": True}


@router.get("/me/persona")
async def get_my_persona(
    user: dict = Depends(get_current_user),
    repo=Depends(get_user_profile_repo),
) -> dict:
    vector = await get_profile(repo, user["sub"])
    if vector is None:
        return {"persona": None}
    persona = classify_persona(FlavorVector.from_list(vector))
    return {
        "persona": {
            "id": persona.id,
            "name": persona.name,
            "icon": persona.icon,
            "description": persona.description,
        }
    }


@router.post("/me/rate")
async def rate_beer(
    body: RateRequest,
    user: dict = Depends(get_current_user),
    repo=Depends(get_user_profile_repo),
) -> dict:
    updated = await apply_rating(repo, user["sub"], body.beer, body.rating)
    return {"updated_vector": updated}
