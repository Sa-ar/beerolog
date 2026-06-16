from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------


class HealthResponse(BaseModel):
    status: Literal["ok"]


class ComponentStatus(BaseModel):
    name: Literal["process", "config", "database", "embedding_provider"]
    status: Literal["ok", "degraded", "down"]
    detail: str | None = None


class ReadinessResponse(BaseModel):
    status: Literal["ready", "not_ready"]
    components: list[ComponentStatus]


class TypedError(BaseModel):
    """Distinct shape for expected failures — not a generic 500."""

    error_type: Literal["auth", "validation", "config", "dependency"]
    detail: str
    request_id: str | None = None


# ---------------------------------------------------------------------------
# Onboarding / BaselineTaste
# ---------------------------------------------------------------------------


class CoffeeStyle(StrEnum):
    black = "black"
    espresso = "espresso"
    hafuch = "hafuch"
    iced_sweet = "iced_sweet"
    none = "none"


class Carbonation(StrEnum):
    still = "still"
    light = "light"
    strong = "strong"


class SnackPick(StrEnum):
    dark_chocolate = "dark_chocolate"
    halva = "halva"
    fresh_fruit = "fresh_fruit"
    milk_chocolate = "milk_chocolate"


class LovePref(StrEnum):
    love = "love"
    okay = "okay"
    avoid = "avoid"


class CitrusPick(StrEnum):
    grapefruit = "grapefruit"
    orange = "orange"
    lemonade = "lemonade"
    none = "none"


class OnboardingAnswers(BaseModel):
    coffee: CoffeeStyle
    water: Carbonation
    novelty_seeking: bool
    snack: SnackPick
    sour_foods: LovePref
    citrus: CitrusPick
    smoked_foods: LovePref


class BaselineTasteDials(BaseModel):
    """User-facing, editable taste dials derived from onboarding answers."""

    bubbles: Annotated[float, Field(ge=0.0, le=1.0)]
    bitterness: Annotated[float, Field(ge=0.0, le=1.0)]
    flavor_family: dict[str, Annotated[float, Field(ge=0.0, le=1.0)]]
    # Keys: malty, hoppy, roasty, fruity, sour, smoky
    novelty_affinity: Annotated[float, Field(ge=0.0, le=1.0)]


# ---------------------------------------------------------------------------
# SessionIntent
# ---------------------------------------------------------------------------


class Vibe(StrEnum):
    refreshing = "refreshing"
    cozy = "cozy"
    adventurous = "adventurous"
    familiar = "familiar"


class AbvIntent(StrEnum):
    low = "low"
    medium = "medium"
    high = "high"
    any = "any"


class SessionIntent(BaseModel):
    vibe: Vibe
    abv_intent: AbvIntent
    free_text: str = ""


# ---------------------------------------------------------------------------
# Recommendations
# ---------------------------------------------------------------------------


class DominantComponent(StrEnum):
    baseline = "baseline"
    session = "session"
    novelty_positive = "novelty_positive"
    novelty_negative = "novelty_negative"


class ScoreBreakdown(BaseModel):
    baseline_score: float
    session_score: float
    novelty_score: float
    total_score: float
    dominant_component: DominantComponent


class RecommendedBeer(BaseModel):
    id: str
    name: str
    brewery: str
    style: str
    abv: float
    market_tier: Literal["mainstream", "craft", "import"]
    image_url: str | None = None
    why_line: str
    breakdown: ScoreBreakdown


class RecommendationsRequest(BaseModel):
    """Debug-style request: caller supplies the dials + intent directly.

    Slice #76 introduces persisted BaselineTaste; this slice posts the
    answers inline to keep the smoke test independent of user persistence.
    """

    baseline: BaselineTasteDials
    session: SessionIntent | None = None
    alpha: float | None = None
    beta: float | None = None
    top_k: int = 5


class RecommendationsResponse(BaseModel):
    results: list[RecommendedBeer]
    alpha: float
    beta: float
