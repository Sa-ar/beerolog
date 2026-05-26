from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, Field

from app.models.flavor import FlavorVector

FlavorVectorList = Annotated[list[float], Field(min_length=7, max_length=7)]


class RatingValue(StrEnum):
    loved = "loved"
    fine = "fine"
    disliked = "disliked"


class BeerPayload(BaseModel):
    id: str
    name: str
    style: str
    flavor_vector: FlavorVectorList
    brewery: str | None = None
    description: str | None = None


class RecommendationRequest(BaseModel):
    taste_vector: FlavorVector
    beers: list[BeerPayload]


class RecommendationResponse(BaseModel):
    best: BeerPayload
    backup: BeerPayload | None
    adventurous: BeerPayload | None
    explanations: dict[str, str]


class TapListRequest(BaseModel):
    beer_ids: list[str]


class TapListResponse(BaseModel):
    venue_id: str
    beer_ids: list[str]


class ScanCatalogEntry(BaseModel):
    id: str
    name: str
    brewery: str


class ScanMenuRequest(BaseModel):
    image_base64: str
    catalog: list[ScanCatalogEntry]


class ScanResultItem(BaseModel):
    raw_text: str
    matched_id: str | None
    confidence: float
    needs_review: bool


class ProfileResponse(BaseModel):
    user_id: str
    vector: list[float] | None


class SaveProfileRequest(BaseModel):
    vector: FlavorVectorList


class HistoryEntry(BaseModel):
    beer_id: str
    rating: RatingValue | None
    tried_at: str


class HistoryResponse(BaseModel):
    entries: list[HistoryEntry]


class AddHistoryRequest(BaseModel):
    beer_id: str
    rating: RatingValue | None = None


class PersonaSummary(BaseModel):
    id: str
    name: str
    icon: str
    description: str | None = None


class PersonaResponse(BaseModel):
    persona: PersonaSummary | None


class RatedBeerInput(BaseModel):
    id: str
    name: str
    style: str
    flavor_vector: FlavorVectorList
    brewery: str | None = None
    description: str | None = None


class RateBeerRequest(BaseModel):
    beer: RatedBeerInput
    rating: RatingValue


class UpdatedVectorResponse(BaseModel):
    updated_vector: list[float] | None


class ChallengeTokenResponse(BaseModel):
    token: str


class ChallengeVectorRequest(BaseModel):
    vector: list[float]


class ChallengeComparisonResponse(BaseModel):
    similarity: float
    shared: list[str]
    different: list[str]
    challenger_persona: PersonaSummary
    friend_persona: PersonaSummary


class CreateSessionRequest(BaseModel):
    host_id: str


class CreateSessionResponse(BaseModel):
    session_id: str
    expires_at: str


class JoinSessionRequest(BaseModel):
    name: str


class JoinSessionResponse(BaseModel):
    participant_id: str


class SubmitVectorRequest(BaseModel):
    participant_id: str
    vector: list[float]


class OkResponse(BaseModel):
    ok: bool


class SessionParticipantStatus(BaseModel):
    id: str
    name: str
    submitted: bool


class SessionStatusResponse(BaseModel):
    session_id: str
    total: int
    completed: int
    participants: list[SessionParticipantStatus]


class GroupRecommendationResponse(BaseModel):
    group_vector: list[float]
    high_variance: bool


class LeaderboardEntryResponse(BaseModel):
    user_id: str
    username: str
    persona_icon: str
    recommendation_count: int
    rank: int


class LeaderboardResponse(BaseModel):
    entries: list[LeaderboardEntryResponse]
    viewer_rank: int | None


class HealthResponse(BaseModel):
    status: str
