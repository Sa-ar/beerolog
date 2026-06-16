"""GET /debug/recommendations — smoke route for slice #74.

Returns a hard-coded onboarding example through the full pipeline so
operators can sanity-check the wire-up without crafting a payload.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api_contracts import (
    AbvIntent,
    Carbonation,
    CitrusPick,
    CoffeeStyle,
    LovePref,
    OnboardingAnswers,
    RecommendationsRequest,
    RecommendationsResponse,
    SessionIntent,
    SnackPick,
    Vibe,
)
from app.routes.recommendations import (
    _embedding_client_dep,
    post_recommendations,
)
from app.services.baseline_taste import compose_dials
from app.services.embedding_service import EmbeddingClient

router = APIRouter(prefix="/debug", tags=["debug"])

_DEFAULT_ANSWERS = OnboardingAnswers(
    coffee=CoffeeStyle.black,
    water=Carbonation.strong,
    novelty_seeking=True,
    snack=SnackPick.dark_chocolate,
    sour_foods=LovePref.okay,
    citrus=CitrusPick.grapefruit,
    smoked_foods=LovePref.okay,
)

_DEFAULT_SESSION = SessionIntent(
    vibe=Vibe.adventurous,
    abv_intent=AbvIntent.medium,
    free_text="hot evening in Tel Aviv, just ate hummus",
)


@router.get(
    "/recommendations",
    response_model=RecommendationsResponse,
    operation_id="debugRecommendations",
)
async def debug_recommendations(
    client: EmbeddingClient = Depends(_embedding_client_dep),
) -> RecommendationsResponse:
    dials = compose_dials(_DEFAULT_ANSWERS)
    request = RecommendationsRequest(baseline=dials, session=_DEFAULT_SESSION)
    return await post_recommendations(request, client=client)
