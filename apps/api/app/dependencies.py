from fastapi import HTTPException, status

from app.config import settings
from app.db import get_pool


async def get_db_pool():
    if not settings.database_url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="DATABASE_URL is not configured",
        )
    return await get_pool()
