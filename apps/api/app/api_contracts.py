from datetime import datetime
from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, Field

from app.ratings_vocab import RatingValue

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
    # max_length bounds the payload at the trust boundary (public endpoint):
    # there are only this many distinct cues, so a longer list is dup-stuffing.
    avoids: list[AvoidCue] = Field(default_factory=list, max_length=4)
    # Optional capstone flavor-cue grid.
    flavor_cues: list[FlavorCue] = Field(default_factory=list, max_length=8)


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
# Public catalog (agent-ready, unauthenticated)
# ---------------------------------------------------------------------------


class CatalogBeer(BaseModel):
    # market_tier / color are plain str here (not Literal) so an unexpected DB
    # value never 500s this public read surface.
    id: str
    name: str
    name_hebrew: str | None = None
    brewery: str
    style: str
    abv: float
    market_tier: str
    color: str
    image_url: str | None = None
    adventurousness: float


class CatalogListResponse(BaseModel):
    beers: list[CatalogBeer]
    page: int
    page_size: int
    total: int


class CatalogRecommendRequest(BaseModel):
    preference_text: str = Field(min_length=1, max_length=500)
    limit: int = Field(default=5, ge=1, le=20)


class CatalogRecommendation(BaseModel):
    beer: CatalogBeer
    why: WhyLine


class CatalogRecommendResponse(BaseModel):
    results: list[CatalogRecommendation]


# ---------------------------------------------------------------------------
# Availability ("where can I buy this beer")
# ---------------------------------------------------------------------------


class AvailabilityVenue(BaseModel):
    id: str
    name: str
    name_hebrew: str | None = None
    type: Literal["shop", "pub"]
    city: str
    area: str | None = None
    address: str | None = None
    url: str | None = None
    confidence: float
    last_confirmed_at: datetime | None = None


class AvailabilityRequest(BaseModel):
    beer_ids: list[str]
    # Free-text city/area filter; when omitted, all known venues are returned.
    area: str | None = None


class AvailabilityResponse(BaseModel):
    # Maps each beer id to the venues that stock it (absent id == no records).
    availability: dict[str, list[AvailabilityVenue]]


class AvailabilityReportRequest(BaseModel):
    beer_id: str
    venue_id: str
    kind: Literal["user_confirm", "user_deny"]


class AvailabilityReportResponse(BaseModel):
    accepted: bool
    reason: str | None = None  # 'cooldown' | 'rate_limit' when not accepted


class AvailabilityFlagRequest(BaseModel):
    beer_id: str
    venue_id: str
    reason: str | None = None


class AvailabilityFlagResponse(BaseModel):
    accepted: bool
    # True once enough distinct reporters have flagged this pairing that it is
    # now hidden from reads (slice #166).
    hidden: bool = False


class NewVenueInput(BaseModel):
    name: str
    type: Literal["shop", "pub"]
    city: str
    area: str | None = None
    address: str | None = None


class AddPlaceRequest(BaseModel):
    beer_id: str
    # Attach to an existing venue, or describe a new one to resolve/create.
    venue_id: str | None = None
    venue: NewVenueInput | None = None
    force_new: bool = False


class AddPlaceResponse(BaseModel):
    status: Literal["created", "attached", "suggested", "rejected"]
    venue_id: str | None = None
    reason: str | None = None


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


# 3-state taste feedback vocabulary (RatingValue) is imported from
# app.ratings_vocab at the top of this module.


class CreateRatingRequest(BaseModel):
    beer_id: str
    rating: RatingValue
    note: str | None = None


class RatingRecord(BaseModel):
    id: str
    beer_id: str
    beer_name: str
    beer_brewery: str
    rating: RatingValue
    note: str | None
    created_at: str  # ISO-8601


class RatingsHistoryResponse(BaseModel):
    ratings: list[RatingRecord]
    page: int
    page_size: int


class DeckBeer(BaseModel):
    id: str
    name: str
    name_hebrew: str | None = None
    brewery: str
    style: str
    abv: float
    market_tier: Literal["mainstream", "craft", "import"]
    color: str | None = None
    image_url: str | None = None


class RateDeckResponse(BaseModel):
    beers: list[DeckBeer]


class RateSwipe(BaseModel):
    beer_id: str
    rating: RatingValue
    note: str | None = None


class RateSessionRequest(BaseModel):
    swipes: list[RateSwipe]


class RateSessionResponse(BaseModel):
    recorded: int
