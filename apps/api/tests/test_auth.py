from unittest.mock import MagicMock

import pytest  # type: ignore[import-not-found]
from fastapi import HTTPException  # type: ignore[import-not-found]
from jose import JWTError  # type: ignore[import-not-found]

from app import auth
from app.auth import (
    clerk_frontend_api_url,
    clerk_jwks_url,
    get_current_user,
)
from app.config import settings


def test_clerk_jwks_url_derived_from_publishable_key():
    publishable_key = "pk_test_ZXhhbXBsZS5hY2NvdW50cy5kZXYk"

    assert clerk_frontend_api_url(publishable_key) == "https://example.accounts.dev"
    assert clerk_jwks_url(publishable_key) == "https://example.accounts.dev/.well-known/jwks.json"


def test_clerk_frontend_api_url_handles_unpadded_publishable_key():
    # Real Clerk keys often encode to a length that is not a multiple of 4 and
    # arrive without '=' padding (Clerk strips it). b64decode rejects that
    # without manual repadding.
    publishable_key = "pk_test_aW50ZWdyYWwtZmVycmV0LTI2LmNsZXJrLmFjY291bnRzLmRldiQ"

    assert (
        clerk_frontend_api_url(publishable_key) == "https://integral-ferret-26.clerk.accounts.dev"
    )


def test_get_current_user_raises_401_when_credentials_missing():
    with pytest.raises(HTTPException) as exc:
        get_current_user(None)

    assert exc.value.status_code == 401
    assert exc.value.detail == "Not authenticated"


def test_get_current_user_returns_clerk_payload(monkeypatch):
    payload = {"sub": "user_clerk_abc", "email": "test@example.com"}
    monkeypatch.setattr(auth, "_decode_clerk_token", lambda _token: payload)

    credentials = MagicMock(credentials="fake-token")
    assert get_current_user(credentials) == payload


def test_get_current_user_raises_401_for_invalid_token(monkeypatch):
    def raise_jwt_error(_token: str) -> dict:
        raise JWTError("Token is expired")

    monkeypatch.setattr(auth, "_decode_clerk_token", raise_jwt_error)

    credentials = MagicMock(credentials="expired-token")
    with pytest.raises(HTTPException) as exc:
        get_current_user(credentials)

    assert exc.value.status_code == 401
    assert "expired" in exc.value.detail


def test_decode_clerk_token_refetches_jwks_once_on_verification_failure(monkeypatch):
    auth._clear_jwks_cache()
    monkeypatch.setattr(settings, "clerk_publishable_key", "pk_test_ZXhhbXBsZS5hY2NvdW50cy5kZXYk")
    monkeypatch.setattr(settings, "cors_allowed_origins", ["http://localhost:3000"])

    fetch_count = 0
    decode_calls = 0

    def fake_fetch_jwks() -> dict:
        nonlocal fetch_count
        fetch_count += 1
        return {"keys": [{"kid": f"k{fetch_count}"}]}

    def fake_decode(token, jwks, algorithms, options):  # noqa: ANN001
        nonlocal decode_calls
        decode_calls += 1
        if decode_calls == 1:
            raise JWTError("Unable to find a signing key that matches")
        return {"sub": "user_clerk_abc", "azp": "http://localhost:3000"}

    monkeypatch.setattr(auth, "_fetch_jwks", fake_fetch_jwks)
    monkeypatch.setattr(auth.jwt, "decode", fake_decode)

    payload = auth._decode_clerk_token("token-value")

    assert payload["sub"] == "user_clerk_abc"
    assert fetch_count == 2
    assert decode_calls == 2


def test_validate_azp_rejects_unknown_origin(monkeypatch):
    auth._clear_jwks_cache()
    monkeypatch.setattr(settings, "clerk_publishable_key", "pk_test_ZXhhbXBsZS5hY2NvdW50cy5kZXYk")
    monkeypatch.setattr(settings, "cors_allowed_origins", ["http://localhost:3000"])
    monkeypatch.setattr(auth, "_fetch_jwks", lambda: {"keys": []})
    monkeypatch.setattr(
        auth.jwt,
        "decode",
        lambda *args, **kwargs: {"sub": "user_clerk_abc", "azp": "https://evil.example"},
    )

    with pytest.raises(JWTError, match="authorized party"):
        auth._decode_clerk_token("token-value")


def test_validate_azp_accepts_project_preview_origin(monkeypatch):
    auth._clear_jwks_cache()
    monkeypatch.setattr(settings, "clerk_publishable_key", "pk_test_ZXhhbXBsZS5hY2NvdW50cy5kZXYk")
    monkeypatch.setattr(settings, "cors_allowed_origins", ["http://localhost:3000"])
    monkeypatch.setattr(auth, "_fetch_jwks", lambda: {"keys": []})
    monkeypatch.setattr(
        auth.jwt,
        "decode",
        lambda *args, **kwargs: {
            "sub": "user_clerk_abc",
            "azp": "https://beerolog-git-tech-debt-deaf43-saars-projects-d2973f9d.vercel.app",
        },
    )

    payload = auth._decode_clerk_token("token-value")
    assert payload["sub"] == "user_clerk_abc"
