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


class TasteProfileIcon(BaseModel):
    purpose: str
    flavor_key: str | None = None
    svg: str


class TasteProfileIcons(BaseModel):
    hero: TasteProfileIcon
    flavors: list[TasteProfileIcon]


class BaselineTasteRecord(BaseModel):
    """Persisted BaselineTaste returned by /me/baseline-taste."""

    user_id: str
    bubbles: float
    bitterness: float
    flavor_family: dict[str, float]
    novelty_affinity: float
    embedding_fresh_at: str  # ISO-8601
    updated_at: str  # ISO-8601
    icons: TasteProfileIcons | None = None


class CatalogIconItem(BaseModel):
    key: str
    purpose: str
    svg: str


class IconCatalogResponse(BaseModel):
    session_vibes: list[CatalogIconItem] = []
    session_abv: list[CatalogIconItem] = []
    journey: list[CatalogIconItem] = []
    flavors: list[CatalogIconItem] = []
    marketing: list[CatalogIconItem] = []


class PatchBaselineTasteRequest(BaseModel):
    bubbles: Annotated[float, Field(ge=0.0, le=1.0)] | None = None
    bitterness: Annotated[float, Field(ge=0.0, le=1.0)] | None = None
    flavor_family: dict[str, Annotated[float, Field(ge=0.0, le=1.0)]] | None = None
    novelty_affinity: Annotated[float, Field(ge=0.0, le=1.0)] | None = None


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
    abv = "abv"
    novelty_positive = "novelty_positive"
    novelty_negative = "novelty_negative"


class ScoreBreakdown(BaseModel):
    baseline_cos: float
    session_cos: float
    baseline_score: float
    session_score: float
    abv_score: float
    abv_fits_intent: bool | None = None
    novelty_score: float
    total_score: float
    dominant_component: DominantComponent


class WhyLine(BaseModel):
    """Language-neutral recommendation explanation.

    The API picks the code + params; the frontend renders the localized
    sentence (key why.<code>). Keeps copy in one place and the embedding
    templates English-only.
    """

    code: str
    params: dict[str, str] = Field(default_factory=dict)


class RecommendedBeer(BaseModel):
    id: str
    name: str
    name_hebrew: str | None = None
    brewery: str
    style: str
    abv: float
    market_tier: Literal["mainstream", "craft", "import"]
    color: Literal["pale", "gold", "amber", "brown", "dark"]
    image_url: str | None = None
    why: WhyLine
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


class MatchCalibration(BaseModel):
    """Fixed affine anchors for user-facing cosine % (not result-set normalization)."""

    cos_floor: float
    cos_ceiling: float


class RecommendationsResponse(BaseModel):
    results: list[RecommendedBeer]
    alpha: float
    beta: float
    calibration: MatchCalibration


# ---------------------------------------------------------------------------
# Ratings (slice #78)
# ---------------------------------------------------------------------------


RatingValue = Annotated[int, Field(ge=1, le=5)]


class CreateRatingRequest(BaseModel):
    beer_id: str
    rating: RatingValue
    note: str | None = None


class RatingRecord(BaseModel):
    id: str
    beer_id: str
    beer_name: str
    beer_brewery: str
    rating: int
    note: str | None
    created_at: str  # ISO-8601


class RatingsHistoryResponse(BaseModel):
    ratings: list[RatingRecord]
    page: int
    page_size: int
