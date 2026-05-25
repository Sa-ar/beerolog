from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.dependencies import get_llm_client
from app.models.flavor import FlavorVector
from app.services.explanation_service import generate_explanations
from app.services.recommendation_service import score_beers

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


class BeerInput(BaseModel):
    id: str
    name: str
    brewery: str
    style: str
    flavor_vector: list[float]
    description: str | None = None


class RecommendationRequest(BaseModel):
    taste_vector: FlavorVector
    beers: list[BeerInput]


class RecommendationResponse(BaseModel):
    best: BeerInput
    backup: BeerInput | None
    adventurous: BeerInput | None
    explanations: dict[str, str]  # beer_id -> explanation


@router.post("/")
async def recommend(
    req: RecommendationRequest, llm=Depends(get_llm_client)
) -> RecommendationResponse:
    if not req.beers:
        raise HTTPException(status_code=422, detail="No beers provided")

    adventure_boost = req.taste_vector.adventure * 2 - 1  # map 0-1 to -1..+1
    scored = score_beers(
        req.taste_vector,
        [b.model_dump() for b in req.beers],
        adventure_boost=adventure_boost,
    )

    # Slots: best = #1, backup = #2, adventurous = highest outlier not in top 2
    best = BeerInput(**{k: v for k, v in scored[0].items() if k != "score"})
    backup = (
        BeerInput(**{k: v for k, v in scored[1].items() if k != "score"})
        if len(scored) > 1
        else None
    )
    adventurous = (
        BeerInput(**{k: v for k, v in scored[-1].items() if k != "score"})
        if len(scored) > 2
        else None
    )

    top_beers = [b for b in [best, backup, adventurous] if b is not None]
    explanations = await generate_explanations(
        req.taste_vector,
        [b.model_dump() for b in top_beers],
        llm,
    )

    return RecommendationResponse(
        best=best,
        backup=backup,
        adventurous=adventurous,
        explanations=explanations,
    )
