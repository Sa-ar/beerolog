"""Unit tests for the batched why explainer (stubbed — no OpenAI)."""

from __future__ import annotations

import pytest

from app.api_contracts import WhyFact
from app.services.why_explainer import NullWhyExplainer, WhyBeerInput


@pytest.mark.asyncio
async def test_null_explainer_returns_none_per_beer() -> None:
    beers = [
        WhyBeerInput(
            id="a",
            name="A",
            brewery="B",
            style="IPA",
            abv=5.0,
            market_tier="craft",
            facts=[WhyFact(code="style", params={"style": "IPA"})],
        ),
        WhyBeerInput(
            id="b",
            name="B",
            brewery="B",
            style="Lager",
            abv=4.5,
            market_tier="mainstream",
            facts=[WhyFact(code="style", params={"style": "Lager"})],
        ),
    ]
    out = await NullWhyExplainer().explain_batch(beers, locale="en")
    assert out == {"a": None, "b": None}
