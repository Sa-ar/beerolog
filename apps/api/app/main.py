from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import close_pool
from app.observability import configure_logging, instrument_requests, logger
from app.routes import health, recommendations, users

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
    if settings.app_env != "development" and settings.api_secret == "dev-secret":
        logger.warning("API_SECRET is still using the development default in %s", settings.app_env)
    try:
        yield
    finally:
        await close_pool()
        logger.info("Beerolog API shutdown complete")


app = FastAPI(title="Beerolog API", version="0.0.1", lifespan=lifespan)
app.middleware("http")(instrument_requests)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(recommendations.router)
app.include_router(users.router)
