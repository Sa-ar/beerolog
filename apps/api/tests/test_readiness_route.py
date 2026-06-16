"""Tests for GET /health/ready and typed-error handling."""

from __future__ import annotations

from fastapi.testclient import TestClient  # type: ignore[import-not-found]

from app.config import settings
from app.errors import AuthError, ConfigError, DependencyError, ValidationError
from app.main import app


def test_liveness_health_is_unchanged() -> None:
    client = TestClient(app)
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_readiness_reports_per_component(monkeypatch) -> None:
    monkeypatch.setattr(settings, "database_url", "")
    monkeypatch.setattr(settings, "openai_api_key", "")
    monkeypatch.setattr(settings, "clerk_publishable_key", "")
    monkeypatch.setattr(settings, "clerk_secret_key", "")
    client = TestClient(app)
    r = client.get("/health/ready")
    assert r.status_code == 503
    body = r.json()
    assert body["status"] == "not_ready"
    names = {c["name"] for c in body["components"]}
    assert {"process", "config", "database", "embedding_provider"}.issubset(names)


def test_readiness_does_not_leak_database_url(monkeypatch) -> None:
    secret_dsn = "postgresql://hunter2:super-secret@db.internal/main"
    monkeypatch.setattr(settings, "database_url", secret_dsn)
    client = TestClient(app)
    r = client.get("/health/ready")
    body = r.text
    assert "hunter2" not in body
    assert "super-secret" not in body
    assert "db.internal" not in body


def test_readiness_does_not_leak_openai_key(monkeypatch) -> None:
    monkeypatch.setattr(settings, "openai_api_key", "sk-proj-LEAK-ME-12345")
    client = TestClient(app)
    r = client.get("/health/ready")
    assert "sk-proj-LEAK-ME-12345" not in r.text


def test_typed_errors_each_get_distinct_status_codes() -> None:
    from fastapi import APIRouter

    diagnostic = APIRouter()

    @diagnostic.get("/diag/auth")
    async def diag_auth() -> None:
        raise AuthError("missing bearer")

    @diagnostic.get("/diag/validation")
    async def diag_validation() -> None:
        raise ValidationError("bad body")

    @diagnostic.get("/diag/config")
    async def diag_config() -> None:
        raise ConfigError("OPENAI_API_KEY missing")

    @diagnostic.get("/diag/dependency")
    async def diag_dependency() -> None:
        raise DependencyError("openai timeout")

    app.include_router(diagnostic)
    try:
        client = TestClient(app)
        cases = {
            "/diag/auth": (401, "auth"),
            "/diag/validation": (400, "validation"),
            "/diag/config": (503, "config"),
            "/diag/dependency": (503, "dependency"),
        }
        for path, (status_code, error_type) in cases.items():
            r = client.get(path)
            assert r.status_code == status_code, path
            body = r.json()
            assert body["error_type"] == error_type
            assert body["detail"]
    finally:
        # Remove the diagnostic routes so other tests aren't affected.
        app.router.routes = [
            route
            for route in app.router.routes
            if not (getattr(route, "path", "") or "").startswith("/diag/")
        ]
