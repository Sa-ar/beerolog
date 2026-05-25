import pytest
from unittest.mock import AsyncMock, MagicMock
from app.services.explanation_service import generate_explanations
from app.models.flavor import FlavorVector

LAGER_VECTOR = FlavorVector(bitterness=0.2, sweetness=0.15, fruitiness=0.1, roast=0.0, sourness=0.0, body=0.25, adventure=0.15)

BEERS = [
    {'id': 'b1', 'name': 'Heineken', 'brewery': 'Heineken', 'style': 'lager', 'flavor_vector': [0.2, 0.15, 0.1, 0.0, 0.0, 0.25, 0.15]},
    {'id': 'b2', 'name': 'Guinness Draught', 'brewery': 'Guinness', 'style': 'stout', 'flavor_vector': [0.4, 0.3, 0.1, 0.9, 0.0, 0.8, 0.3]},
]


def make_llm(response_text: str) -> AsyncMock:
    choice = MagicMock()
    choice.message.content = response_text
    completion = MagicMock()
    completion.choices = [choice]
    llm = AsyncMock()
    llm.chat.completions.create = AsyncMock(return_value=completion)
    return llm


@pytest.mark.asyncio
async def test_returns_explanation_per_beer():
    llm = make_llm('b1: A crisp, refreshing match for your light taste profile.\nb2: A bold contrast that might surprise you.')
    result = await generate_explanations(LAGER_VECTOR, BEERS, llm)

    assert 'b1' in result
    assert 'b2' in result
    assert len(result['b1']) > 0
    assert len(result['b2']) > 0


@pytest.mark.asyncio
async def test_makes_exactly_one_llm_call():
    llm = make_llm('b1: Great pick.\nb2: Solid backup.')
    await generate_explanations(LAGER_VECTOR, BEERS, llm)

    assert llm.chat.completions.create.call_count == 1


@pytest.mark.asyncio
async def test_falls_back_gracefully_on_llm_error():
    llm = AsyncMock()
    llm.chat.completions.create = AsyncMock(side_effect=Exception('API down'))
    result = await generate_explanations(LAGER_VECTOR, BEERS, llm)

    assert 'b1' in result
    assert 'b2' in result
    # fallback should still return something
    assert all(len(v) > 0 for v in result.values())
