"""Unit tests for the grounding guard in the menu-chat service."""

import pytest

from app.services.menu_chat import ChatReply, ChatTurn, PoolBeer, chat_over_pool


class _StubLLM:
    def __init__(self, reply: ChatReply) -> None:
        self._reply = reply

    async def converse(self, *, pool, messages) -> ChatReply:
        return self._reply


POOL = [PoolBeer(id="1", name="Punk IPA"), PoolBeer(id="2", name="Guinness")]
MESSAGES = [ChatTurn(role="user", content="something hoppy?")]


@pytest.mark.asyncio
async def test_drops_ids_not_in_pool():
    # LLM cites a real id and a hallucinated one -> only the real id survives.
    llm = _StubLLM(ChatReply(reply="Try the Punk IPA.", beer_ids=["1", "999"]))
    result = await chat_over_pool(POOL, MESSAGES, llm)
    assert result.beer_ids == ["1"]
    assert result.reply == "Try the Punk IPA."


@pytest.mark.asyncio
async def test_dedupes_and_preserves_order():
    llm = _StubLLM(ChatReply(reply="Two picks.", beer_ids=["2", "1", "2"]))
    result = await chat_over_pool(POOL, MESSAGES, llm)
    assert result.beer_ids == ["2", "1"]
