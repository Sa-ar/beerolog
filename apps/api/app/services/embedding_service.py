"""Embedding service: wraps text-embedding-3-large.

Kept narrow on purpose. The whole match pipeline depends on `embed`
producing a 1536-D vector for an arbitrary string. Tests mock this call.
"""

from __future__ import annotations

from typing import Protocol

from app.config import settings

EMBEDDING_DIM = 1536


class EmbeddingClient(Protocol):
    async def embed(self, text: str) -> list[float]: ...


class OpenAIEmbeddingClient:
    def __init__(self, api_key: str, model: str) -> None:
        # Lazy-import openai so tests can run without the package installed
        from openai import AsyncOpenAI  # type: ignore[import-not-found]

        self._client = AsyncOpenAI(api_key=api_key)
        self._model = model

    async def embed(self, text: str) -> list[float]:
        # text-embedding-3-large returns 3072 dims by default; the schema is
        # vector(1536), so request the truncated form explicitly.
        resp = await self._client.embeddings.create(
            model=self._model, input=text, dimensions=EMBEDDING_DIM
        )
        return list(resp.data[0].embedding)


def get_embedding_client() -> EmbeddingClient:
    return OpenAIEmbeddingClient(
        api_key=settings.openai_api_key,
        model=settings.embedding_model,
    )
