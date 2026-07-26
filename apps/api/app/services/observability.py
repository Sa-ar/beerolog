"""PostHog LLM observability (AI analytics) for the API's OpenAI calls.

Scaffold: wraps ``AsyncOpenAI`` so each chat/completion emits a PostHog
``$ai_generation`` event (model, token counts, latency, cost). Env-gated on
``POSTHOG_PROJECT_TOKEN`` and degrades to the plain client when PostHog is
unconfigured OR the ``posthog`` package is absent, so tests and OpenAI-free
paths are unaffected.

To instrument a caller, swap ``AsyncOpenAI(api_key=...)`` for
``observed_async_openai(api_key)`` — same interface. All app LLM/embedding callers
are wired (why_explainer, persona, note_analyzer, menu_chat, vision,
embedding_service); the icon-service package has its own env-gated equivalent.
TODO: pass ``posthog_distinct_id=<user_id>`` on ``.create()`` calls to tie AI
events to the product-analytics person (needs the user id threaded down).
"""

from __future__ import annotations

from functools import lru_cache
from typing import Any

from app.config import settings


@lru_cache(maxsize=1)
def _posthog_client() -> Any | None:
    """Memoized PostHog client, or None when unconfigured / package missing."""
    token = settings.posthog_project_token
    if not token:
        return None
    try:
        from posthog import Posthog  # optional dep; lazy so tests don't need it
    except ImportError:
        return None
    return Posthog(project_api_key=token, host=settings.posthog_host)


def observed_async_openai(api_key: str) -> Any:
    """An ``AsyncOpenAI`` client wrapped for PostHog ``$ai_generation`` capture
    when PostHog is configured, else the plain client. Same call interface."""
    ph = _posthog_client()
    if ph is not None:
        try:
            from posthog.ai.openai import AsyncOpenAI as ObservedAsyncOpenAI

            return ObservedAsyncOpenAI(api_key=api_key, posthog_client=ph)
        except ImportError:
            pass  # posthog installed without the ai extra — fall back to plain
    from openai import AsyncOpenAI

    return AsyncOpenAI(api_key=api_key)
