"""Embedding service: wraps text-embedding-3-large.

Kept narrow on purpose. The whole match pipeline depends on `embed`
producing a 1536-D vector for an arbitrary string. Tests mock this call.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Protocol

from app.config import settings

EMBEDDING_DIM = 1536


class EmbeddingClient(Protocol):
    async def embed(self, text: str) -> list[float]: ...


class OpenAIEmbeddingClient:
    def __init__(self, api_key: str, model: str) -> None:
        # PostHog-observed client ($ai_embedding events) when configured, else
        # the plain client. See app/services/observability.py.
        from app.services.observability import observed_async_openai

        self._client = observed_async_openai(api_key)
        self._model = model

    async def embed(self, text: str) -> list[float]:
        # text-embedding-3-large returns 3072 dims by default; the schema is
        # vector(1536), so request the truncated form explicitly.
        resp = await self._client.embeddings.create(
            model=self._model, input=text, dimensions=EMBEDDING_DIM
        )
        return list(resp.data[0].embedding)


@lru_cache(maxsize=4)
def _client_for(api_key: str, model: str) -> EmbeddingClient:
    return OpenAIEmbeddingClient(api_key=api_key, model=model)


def get_embedding_client() -> EmbeddingClient:
    # Memoized per (key, model): one AsyncOpenAI (and its HTTP pool) per process
    # instead of per request, but a settings change (key rotation, a test that
    # swaps the key) yields a fresh client rather than a stale cached one.
    return _client_for(settings.openai_api_key, settings.embedding_model)
