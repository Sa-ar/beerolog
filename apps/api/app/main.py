from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api_contracts import TypedError
from app.config import settings
from app.db import close_pool, get_pool
from app.dependencies import (
    get_deck_catalog,
    get_note_analyzer,
    get_taste_feedback_service,
)
from app.errors import BeerologError
from app.mcp_server import mcp as mcp_server
from app.observability import configure_logging, instrument_requests, logger
from app.routes import (
    admin_moderation,
    availability,
    debug,
    guest_recommendations,
    health,
    icons,
    menu,
    onboarding,
    public_catalog,
    public_places,
    rate,
    ratings,
    recommendations,
    staff,
    staff_analytics,
    staff_menu,
    staff_org,
    users,
    want_to_try,
)
from app.services.account_repo import AsyncpgAccountRepo
from app.services.baseline_taste_repo import AsyncpgBaselineTasteRepo
from app.services.catalog_cache import CatalogCache
from app.services.catalog_repo import (
    AsyncpgBeerDescriptorRepo,
    AsyncpgBeerEmbeddingRepo,
    fetch_catalog,
)
from app.services.embedding_service import get_embedding_client
from app.services.icon_repo import AsyncpgIconRepo
from app.services.note_analyzer import GPTNoteExtractor, NoteAnalyzer
from app.services.ratings_repo import AsyncpgRatingsRepo
from app.services.taste_feedback_service import TasteFeedbackService
from app.services.want_to_try_repo import AsyncpgWantToTryRepo

configure_logging(settings.log_level)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    logger.info(
        "Starting Beerolog API env=%s cors_allowed_origins=%s database_configured=%s openai_configured=%s",
        settings.app_env,
        ",".join(settings.cors_allowed_origins),
        bool(settings.database_url),
        bool(settings.openai_api_key),
    )
    # Fail fast on missing / unsafe configuration in preview and production.
    # Development keeps the warning-only behaviour.
    from app.startup_checks import enforce_non_development_safety

    enforce_non_development_safety(settings)

    if settings.database_url:
        pool = await get_pool()
        app.dependency_overrides[onboarding.get_baseline_taste_repo] = lambda: (
            AsyncpgBaselineTasteRepo(pool)
        )
        app.dependency_overrides[ratings.get_ratings_repo] = lambda: AsyncpgRatingsRepo(pool)
        app.dependency_overrides[want_to_try.get_want_to_try_repo] = lambda: AsyncpgWantToTryRepo(
            pool
        )
        app.dependency_overrides[onboarding.get_icon_repo] = lambda: AsyncpgIconRepo(pool)
        app.dependency_overrides[users.get_account_repo] = lambda: AsyncpgAccountRepo(pool)
        app.dependency_overrides[get_taste_feedback_service] = lambda: TasteFeedbackService(
            baseline_repo=AsyncpgBaselineTasteRepo(pool),
            beer_embeddings=AsyncpgBeerEmbeddingRepo(pool),
            ratings_repo=AsyncpgRatingsRepo(pool),
            settings=settings,
        )

        # The catalog changes only on import/deploy; cache it in-process so the
        # deck stops refetching the full table + embeddings per request (#1).
        catalog_cache = CatalogCache(lambda: fetch_catalog(pool), settings.deck_catalog_ttl_seconds)
        app.dependency_overrides[get_deck_catalog] = catalog_cache.get

        # Real LLM note analysis only when an OpenAI key is present; otherwise the
        # default no-op analyzer applies (notes are still stored).
        if settings.openai_api_key:
            note_analyzer = NoteAnalyzer(
                llm=GPTNoteExtractor(api_key=settings.openai_api_key, model=settings.note_model),
                baseline_repo=AsyncpgBaselineTasteRepo(pool),
                embedding_client=get_embedding_client(),
                beer_descriptors=AsyncpgBeerDescriptorRepo(pool),
                settings=settings,
            )
            app.dependency_overrides[get_note_analyzer] = lambda: note_analyzer

    try:
        # Run the MCP streamable-http session manager alongside the app so the
        # mounted /mcp sub-app works (Starlette does not run mounted lifespans).
        async with mcp_server.session_manager.run():
            yield
    finally:
        await close_pool()
        logger.info("Beerolog API shutdown complete")


app = FastAPI(title="Beerolog API", version="0.0.1", lifespan=lifespan)
app.middleware("http")(instrument_requests)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_origin_regex=settings.effective_cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(icons.router)
app.include_router(menu.router)
app.include_router(onboarding.router)
app.include_router(recommendations.router)
app.include_router(staff.router)
app.include_router(staff_menu.router)
app.include_router(staff_analytics.router)
app.include_router(staff_org.router)
app.include_router(availability.router)
app.include_router(admin_moderation.router)
app.include_router(guest_recommendations.router)
app.include_router(ratings.router)
app.include_router(want_to_try.router)
app.include_router(public_catalog.router)
app.include_router(public_places.router)
app.include_router(rate.router)
app.include_router(users.router)
app.include_router(debug.router)

# Agent-ready MCP surface: tools shim the REST routes above. Mounted (not a
# router) because it is a self-contained ASGI app with its own transport.
app.mount("/mcp", mcp_server.streamable_http_app())


@app.exception_handler(BeerologError)
async def handle_beerolog_error(request: Request, exc: BeerologError) -> JSONResponse:
    """Maps typed app errors to distinct response shapes.

    Operators correlate via `request_id` (set by instrument_requests on every
    response). `error_type` lets logs and dashboards bucket failures into
    auth / validation / config / dependency without parsing free-text details.
    """

    request_id = request.headers.get("X-Request-ID")
    body = TypedError(error_type=exc.error_type, detail=exc.detail, request_id=request_id)
    return JSONResponse(status_code=exc.status_code, content=body.model_dump())
