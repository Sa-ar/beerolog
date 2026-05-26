from fastapi import APIRouter

from app.api_contracts import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse, operation_id="getHealth")
async def health() -> HealthResponse:
    return HealthResponse(status="ok")
