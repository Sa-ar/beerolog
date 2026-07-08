"""Clerk JWT validation."""

import base64
import re

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import settings

bearer = HTTPBearer(auto_error=False)

_jwks_cache: dict | None = None


def clerk_frontend_api_url(publishable_key: str) -> str:
    """Derive the Clerk Frontend API URL from a publishable key."""
    encoded = re.sub(r"^pk_(test|live)_", "", publishable_key)
    encoded += "=" * (-len(encoded) % 4)
    domain = base64.b64decode(encoded).decode("utf-8").removesuffix("$")
    return f"https://{domain}"


def clerk_jwks_url(publishable_key: str) -> str:
    """JWKS URL for manual Clerk session token verification."""
    return f"{clerk_frontend_api_url(publishable_key)}/.well-known/jwks.json"


def _clear_jwks_cache() -> None:
    global _jwks_cache
    _jwks_cache = None


def _fetch_jwks() -> dict:
    if not settings.clerk_publishable_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Clerk is not configured",
        )
    url = clerk_jwks_url(settings.clerk_publishable_key)
    response = httpx.get(url, timeout=10)
    response.raise_for_status()
    return response.json()


def _get_jwks(*, force_refresh: bool = False) -> dict:
    global _jwks_cache
    if force_refresh or _jwks_cache is None:
        _jwks_cache = _fetch_jwks()
    return _jwks_cache


def _validate_azp(payload: dict) -> None:
    azp = payload.get("azp")
    if azp is None:
        return
    # Accept the same origins CORS does: the explicit allowlist plus the Vercel
    # preview-URL regex, so tokens minted on a preview frontend aren't rejected.
    if azp in settings.cors_allowed_origins:
        return
    if re.match(settings.effective_cors_origin_regex, azp):
        return
    raise JWTError("Invalid authorized party")


def _decode_clerk_token(token: str) -> dict:
    last_error: JWTError | None = None
    for force_refresh in (False, True):
        try:
            jwks = _get_jwks(force_refresh=force_refresh)
            payload = jwt.decode(
                token,
                jwks,
                algorithms=["RS256"],
                options={"verify_aud": False},
            )
            _validate_azp(payload)
            return payload
        except JWTError as exc:
            last_error = exc
            if force_refresh:
                break
            _clear_jwks_cache()
    assert last_error is not None
    raise last_error


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> dict:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        return _decode_clerk_token(credentials.credentials)
    except HTTPException:
        raise
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc


def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> dict | None:
    """Like get_current_user but returns None for anonymous requests."""
    if credentials is None:
        return None
    try:
        return get_current_user(credentials)
    except HTTPException:
        return None
