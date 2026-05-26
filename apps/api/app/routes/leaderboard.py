from fastapi import APIRouter, Depends

from app.api_contracts import LeaderboardEntryResponse, LeaderboardResponse
from app.auth import get_current_user
from app.dependencies import get_leaderboard_repo
from app.services.leaderboard import get_leaderboard

router = APIRouter(tags=["leaderboard"])


@router.get(
    "/venues/{venue_id}/leaderboard",
    response_model=LeaderboardResponse,
    operation_id="getVenueLeaderboard",
)
async def venue_leaderboard(
    venue_id: str,
    repo=Depends(get_leaderboard_repo),
    current_user: dict = Depends(get_current_user),
) -> LeaderboardResponse:
    result = await get_leaderboard(
        venue_id=venue_id,
        viewer_id=current_user["sub"],
        repo=repo,
    )
    return LeaderboardResponse(
        entries=[
            LeaderboardEntryResponse(
                user_id=e.user_id,
                username=e.username,
                persona_icon=e.persona_icon,
                recommendation_count=e.recommendation_count,
                rank=e.rank,
            )
            for e in result["entries"]
        ],
        viewer_rank=result["viewer_rank"],
    )
