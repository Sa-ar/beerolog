from datetime import datetime
from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, Field, computed_field

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


class BitternessDirect(StrEnum):
    love = "love"
    some = "some"
    wince = "wince"


class RoastedPref(StrEnum):
    # Graded like→dislike for roasted/coffee/dark-roast FLAVOR (bipolar, with a
    # real neutral and a strong-aversion anchor). Distinct from bitterness.
    love = "love"
    like = "like"
    neutral = "neutral"
    dislike = "dislike"
    hate = "hate"


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
    # Direct bitterness anchor — a plain-language check that does not lean on the
    # noisy coffee proxy. Always asked in the quiz; optional here so older
    # payloads (and tests) that omit it stay valid.
    bitterness_direct: BitternessDirect | None = None
    # Graded roasted/coffee-FLAVOR preference. Owns the roasty dial across the
    # full range incl. dislike; optional so older payloads stay valid.
    roasted: RoastedPref | None = None
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


class ArchetypeKey(StrEnum):
    """Closed set of shareable taste archetypes (slice #285).

    Derived deterministically from dials by `services.archetype.derive_archetype`.
    The frontend metadata map (slice #286) must cover every member.
    """

    adventurer = "adventurer"
    hop_chaser = "hop-chaser"
    bitter_zealot = "bitter-zealot"
    malt_romantic = "malt-romantic"
    roast_devotee = "roast-devotee"
    fruit_forward = "fruit-forward"
    sour_seeker = "sour-seeker"
    smoke_wanderer = "smoke-wanderer"
    heavyweight = "heavyweight"
    easy_drinker = "easy-drinker"
    crisp_classicist = "crisp-classicist"
    balanced_explorer = "balanced-explorer"


class Archetype(BaseModel):
    """The shareable named taste type. Key-only: the card is rendered from the
    frontend archetype metadata map, not from the user's exact dials."""

    key: ArchetypeKey


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
    archetype: Archetype


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


class WhyFact(BaseModel):
    """Language-neutral match fact for the details accordion / LLM grounding."""

    code: str
    params: dict[str, str] = Field(default_factory=dict)


class WhyLine(BaseModel):
    """Recommendation explanation.

    `code` + `params` are always set (template fallback / analytics). The
    frontend renders `t('why.' + code)` when `text` is absent. When the LLM
    path succeeds, `text` is a short sentence already in the request locale.
    `facts` power the "how we matched" details panel.
    """

    code: str
    params: dict[str, str] = Field(default_factory=dict)
    text: str | None = None
    facts: list[WhyFact] = Field(default_factory=list)


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
    # Detail-view sensory-radar inputs. adventurousness is always present (0..1);
    # ibu is nullable (the bitterness axis drops when absent).
    adventurousness: float
    ibu: int | None = None
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
    # UI language for LLM why-lines (`en` | `he`). Defaults to English.
    locale: Literal["en", "he"] = "en"


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
    ibu: int | None = None


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
    archetype: Archetype


# ---------------------------------------------------------------------------
# Ratings (slice #78)
# ---------------------------------------------------------------------------


# 3-state taste feedback vocabulary (RatingValue) is imported from
# app.ratings_vocab at the top of this module.


class CreateRatingRequest(BaseModel):
    beer_id: str
    rating: RatingValue
    note: str | None = None
    # Proof photo (ADR 0011): presence upgrades the rating to a Catch; content
    # is not verified. Clients may only self-attest — `venue_verified` is a
    # future white-label tier and is never client-writable.
    proof_photo_url: str | None = None
    proof_source: Literal["self_photo"] | None = None


class RatingRecord(BaseModel):
    id: str
    beer_id: str
    beer_name: str
    beer_brewery: str
    rating: RatingValue
    note: str | None
    created_at: str  # ISO-8601
    proof_photo_url: str | None = None
    proof_source: str | None = None

    @computed_field  # type: ignore[prop-decorator]
    @property
    def caught(self) -> bool:
        """A Rating with proof is a Catch (ADR 0011). Single source of truth."""
        return self.proof_photo_url is not None


class RatingsHistoryResponse(BaseModel):
    ratings: list[RatingRecord]
    page: int
    page_size: int
    total: int


class RatingsMapResponse(BaseModel):
    # beer_id -> the current user's rating. The re-rate surfaces (search,
    # recommendations) read this to show the existing rating from server truth.
    ratings: dict[str, RatingValue]


class CatchItem(BaseModel):
    """One caught beer in a user's CatchCollection (a Rating with proof)."""

    beer_id: str
    name: str
    name_hebrew: str | None = None
    brewery: str
    style: str
    color: str | None = None
    image_url: str | None = None
    proof_photo_url: str
    rating: RatingValue
    created_at: str  # ISO-8601


class CatchCollectionResponse(BaseModel):
    # The user's personal, unbounded CatchCollection, newest catch first.
    catches: list[CatchItem]
    count: int


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


# ---------------------------------------------------------------------------
# Want-to-try list (slice #325)
# ---------------------------------------------------------------------------

# right-swipe on `What I want` = "want"; super-like (swipe up) = "must_try"
# (pinned to the top of the Profile list).
WantToTryState = Literal["want", "must_try"]


class CreateWantToTryRequest(BaseModel):
    beer_id: str
    state: WantToTryState = "want"


class WantToTryRecord(BaseModel):
    beer_id: str
    beer_name: str
    beer_brewery: str
    beer_image_url: str | None = None
    state: WantToTryState
    created_at: str  # ISO-8601


class WantToTryListResponse(BaseModel):
    # must_try items first, then most-recent want items.
    items: list[WantToTryRecord]
