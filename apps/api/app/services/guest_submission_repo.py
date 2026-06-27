"""Pseudonymous record of free (signed-out) questionnaire submissions.

Module-level async helper over the shared asyncpg pool. Stores the answers and
which beers we showed, tagged source='free'. No per-person identifier is in the
row, but edge/hosting logs capture IP + request time, so a row is correlatable
to a person — treat as pseudonymous, not anonymous. Aggregate quiz-validation
data, not user tracking. Best-effort: callers swallow and log failures so
recording never affects the guest response.
"""

from __future__ import annotations

import json


async def record(
    pool,
    *,
    answers: dict,
    shown_beer_ids: list[str],
    source: str = "free",
) -> None:
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO guest_submissions (answers, shown_beer_ids, source)
            VALUES ($1::jsonb, $2, $3)
            """,
            json.dumps(answers),
            shown_beer_ids,
            source,
        )
