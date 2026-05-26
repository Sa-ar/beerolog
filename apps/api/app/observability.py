from __future__ import annotations

import logging
from time import perf_counter
from uuid import uuid4

from fastapi import Request  # type: ignore[import-not-found]
from fastapi.responses import JSONResponse, Response  # type: ignore[import-not-found]

LOGGER_NAME = "beerolog.api"
logger = logging.getLogger(LOGGER_NAME)


def configure_logging(level: str) -> None:
    resolved_level = getattr(logging, level.upper(), logging.INFO)
    root_logger = logging.getLogger()

    if not root_logger.handlers:
        logging.basicConfig(
            level=resolved_level,
            format="%(asctime)s %(levelname)s %(name)s %(message)s",
        )

    root_logger.setLevel(resolved_level)
    logger.setLevel(resolved_level)


async def instrument_requests(request: Request, call_next) -> Response:
    request_id = request.headers.get("X-Request-ID") or uuid4().hex
    start = perf_counter()

    try:
        response = await call_next(request)
    except Exception:
        duration_ms = (perf_counter() - start) * 1000
        logger.exception(
            "Unhandled error for %s %s [%s] after %.1f ms",
            request.method,
            request.url.path,
            request_id,
            duration_ms,
        )
        response = JSONResponse(
            status_code=500,
            content={"detail": "Internal server error", "request_id": request_id},
        )
    else:
        duration_ms = (perf_counter() - start) * 1000
        logger.info(
            "%s %s -> %s [request_id=%s duration_ms=%.1f]",
            request.method,
            request.url.path,
            response.status_code,
            request_id,
            duration_ms,
        )

    response.headers["X-Request-ID"] = request_id
    return response
