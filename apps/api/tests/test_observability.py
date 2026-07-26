"""Smoke check for the PostHog LLM-observability scaffold.

When unconfigured (no POSTHOG_PROJECT_TOKEN) it must return a usable plain
OpenAI client and never raise — so OpenAI-free paths and CI stay unaffected.
"""

from openai import AsyncOpenAI

from app.config import settings
from app.services import observability as obs


def test_unconfigured_returns_plain_client(monkeypatch) -> None:
    monkeypatch.setattr(settings, "posthog_project_token", "")
    obs._posthog_client.cache_clear()
    assert obs._posthog_client() is None
    client = obs.observed_async_openai("sk-test")
    assert isinstance(client, AsyncOpenAI)  # plain client, same interface
