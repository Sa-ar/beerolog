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
    milk_based = "milk_based"
    sweet = "sweet"
    none = "none"


class ChocoPref(StrEnum):
    dark_90 = "dark_90"
    dark_70 = "dark_70"
    milk = "milk"
    none = "none"


class Carbonation(StrEnum):
    still = "still"
    light = "light"
    strong = "strong"


class LovePref(StrEnum):
    love = "love"
    okay = "okay"
    avoid = "avoid"


class SourWild(StrEnum):
    bright = "bright"
    funky = "funky"


class SweetPref(StrEnum):
    rich = "rich"
    balanced = "balanced"
    dry = "dry"


class StrengthPref(StrEnum):
    light = "light"
    medium = "medium"
    strong = "strong"


class AdventureLevel(StrEnum):
    low = "low"
    medium = "medium"
    high = "high"


class AvoidCue(StrEnum):
    too_bitter = "too_bitter"
    too_sweet = "too_sweet"
    too_heavy = "too_heavy"
    too_dark = "too_dark"


class FlavorCue(StrEnum):
    grapefruit = "grapefruit"
    caramel = "caramel"
    pine = "pine"
    tropical = "tropical"
    banana_bread = "banana_bread"
    citrus_zest = "citrus_zest"
    coffee = "coffee"
    bread_crust = "bread_crust"


class OnboardingAnswers(BaseModel):
    coffee: CoffeeStyle
    # Conditional bitterness confirm — asked only when coffee is ambiguous.
    chocolate: ChocoPref | None = None
    water: Carbonation
    sour_foods: LovePref
    # Conditional refinement — asked only when sour_foods == love.
    sour_wild: SourWild | None = None
    smoked_foods: LovePref
    sweet_tooth: SweetPref
    strength: StrengthPref
    adventure: AdventureLevel
    # CATA "what puts you off" — multi-select, fired only on an extreme avoid.
    avoids: list[AvoidCue] = Field(default_factory=list)
    # Optional capstone flavor-cue grid.
    flavor_cues: list[FlavorCue] = Field(default_factory=list)


class BaselineTasteDials(BaseModel):
    """User-facing, editable taste dials derived from onboarding answers."""

    bubbles: Annotated[float, Field(ge=0.0, le=1.0)]
    bitterness: Annotated[float, Field(ge=0.0, le=1.0)]
    # New dials default to neutral so callers (e.g. the recommendations debug path)
    # that omit them stay valid; onboarding always sets explicit values.
    sweetness: Annotated[float, Field(ge=0.0, le=1.0)] = 0.5
    body: Annotated[float, Field(ge=0.0, le=1.0)] = 0.5
    abv_affinity: Annotated[float, Field(ge=0.0, le=1.0)] = 0.5
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


class TasteProfilePersona(BaseModel):
    """LLM-generated, cosmetic taste persona, persisted per language."""

    title_en: str
    blurb_en: str
    title_he: str
    blurb_he: str


class BaselineTasteRecord(BaseModel):
    """Persisted BaselineTaste returned by /me/baseline-taste."""

    user_id: str
    bubbles: float
    bitterness: float
    sweetness: float
    body: float
    abv_affinity: float
    flavor_family: dict[str, float]
    novelty_affinity: float
    model_version: int
    persona: TasteProfilePersona | None = None
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
# Guest preview (public, OpenAI-free)
# ---------------------------------------------------------------------------


class GuestRecommendedBeer(BaseModel):
    """Slimmed result for the public guest preview.

    Deliberately decoupled from the authed RecommendedBeer: no score
    breakdown, a plain integer match_percent, and a plain `why` string.
    """

    id: str
    name: str
    name_hebrew: str | None = None
    brewery: str
    style: str
    abv: float
    color: Literal["pale", "gold", "amber", "brown", "dark"]
    image_url: str | None = None
    match_percent: int
    why: str


class GuestRecommendationsResponse(BaseModel):
    results: list[GuestRecommendedBeer]
    unlocked_count: int


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
