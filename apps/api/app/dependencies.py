from fastapi import HTTPException, status

from app.config import settings
from app.db import get_pool
from app.services.match_engine import BeerCandidate
from app.services.note_analyzer import NoOpNoteAnalyzer, NoteAnalyzerProtocol
from app.services.taste_feedback_service import TasteFeedbackService


async def get_db_pool():
    if not settings.database_url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="DATABASE_URL is not configured",
        )
    return await get_pool()


def get_taste_feedback_service() -> TasteFeedbackService:
    """Wired in production via lifespan; overridden in tests."""
    raise NotImplementedError(
        "TasteFeedbackService is not wired in this build. Override via "
        "dependency_overrides in tests, or wire it in the lifespan."
    )


async def get_deck_catalog() -> list[BeerCandidate]:
    """Wired in production via lifespan; overridden in tests."""
    raise NotImplementedError(
        "Deck catalog is not wired in this build. Override via "
        "dependency_overrides in tests, or wire it in the lifespan."
    )


def get_note_analyzer() -> NoteAnalyzerProtocol:
    """Defaults to a no-op (notes still stored); the real LLM analyzer is wired
    in the lifespan when an OpenAI key is present."""
    return NoOpNoteAnalyzer()
