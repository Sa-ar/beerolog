"""Health and readiness routes.

- GET /health is the liveness probe: always 200 when the process is up,
  used by load balancers and uptime checks. Backward-compatible with the
  prior contract.
- GET /health/ready is the readiness probe: 200 only when config and the
  database are ready. Returns a per-component breakdown that operators
  can read at a glance.

Neither route leaks secret values — only presence/absence of config and
binary database connectivity.
"""

from __future__ import annotations

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from app.api_contracts import ComponentStatus, HealthResponse, ReadinessResponse
from app.config import settings
from app.db import get_pool

router = APIRouter()


@router.get("/health", response_model=HealthResponse, operation_id="getHealth")
async def health() -> HealthResponse:
    return HealthResponse(status="ok")


@router.get(
    "/health/ready",
    response_model=ReadinessResponse,
    operation_id="getReadiness",
)
async def readiness() -> JSONResponse:
    components: list[ComponentStatus] = [
        ComponentStatus(name="process", status="ok", detail=f"env={settings.app_env}"),
    ]

    # Config: presence-only checks. Never echoes secret values.
    config_problems: list[str] = []
    if not settings.database_url:
        config_problems.append("DATABASE_URL missing")
    if not settings.openai_api_key:
        config_problems.append("OPENAI_API_KEY missing")
    if not settings.clerk_publishable_key or not settings.clerk_secret_key:
        config_problems.append("Clerk keys missing")
    if settings.app_env != "development" and settings.api_secret == "dev-secret":
        config_problems.append("API_SECRET is still the dev default")

    components.append(
        ComponentStatus(
            name="config",
            status="ok" if not config_problems else "degraded",
            detail="; ".join(config_problems) if config_problems else None,
        )
    )

    # Embedding provider: presence-only check.
    components.append(
        ComponentStatus(
            name="embedding_provider",
            status="ok" if settings.openai_api_key else "down",
            detail=None if settings.openai_api_key else "OPENAI_API_KEY missing",
        )
    )

    # Database: actually ping it if configured.
    if not settings.database_url:
        components.append(
            ComponentStatus(name="database", status="down", detail="DATABASE_URL missing")
        )
    else:
        try:
            pool = await get_pool()
            async with pool.acquire() as conn:
                await conn.execute("SELECT 1")
            components.append(ComponentStatus(name="database", status="ok"))
        except Exception as exc:  # noqa: BLE001
            components.append(
                ComponentStatus(
                    name="database",
                    status="down",
                    # Detail is the exception class name only — do not leak DSN.
                    detail=type(exc).__name__,
                )
            )

    is_ready = all(c.status == "ok" for c in components)
    payload = ReadinessResponse(status="ready" if is_ready else "not_ready", components=components)
    http_status = status.HTTP_200_OK if is_ready else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(status_code=http_status, content=payload.model_dump())
