"""MCP server — a thin protocol shim over the public + authed REST surface.

Every tool forwards to the app's own HTTP routes via an in-process ASGI
transport: no network hop, and zero business logic duplicated from the routes.
User-scoped tools forward the caller's Authorization header, which the existing
Clerk auth dependency validates. Runs stateless (Vercel-friendly); mounted at
/mcp by app.main.
"""

from __future__ import annotations

from typing import Any

import httpx
from mcp.server.fastmcp import Context, FastMCP

mcp = FastMCP("beerolog", stateless_http=True)


def _auth_headers(ctx: Context) -> dict[str, str]:
    """Forward the caller's bearer token from the MCP request to the REST routes."""
    request = getattr(ctx.request_context, "request", None)
    auth = request.headers.get("authorization") if request is not None else None
    return {"authorization": auth} if auth else {}


async def _call(
    method: str,
    path: str,
    *,
    json: Any | None = None,
    params: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
) -> Any:
    # Lazy import to avoid a circular import at module load (main imports us).
    from app.main import app

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://mcp.internal") as client:
        resp = await client.request(method, path, json=json, params=params, headers=headers)
    resp.raise_for_status()
    return resp.json()


@mcp.tool()
async def search_catalog(
    q: str | None = None,
    style: str | None = None,
    brewery: str | None = None,
    min_abv: float | None = None,
    max_abv: float | None = None,
    limit: int = 20,
) -> list[dict]:
    """Search the Beerolog beer catalog by free text, style, brewery, or ABV band."""
    params = {
        k: v
        for k, v in {
            "q": q,
            "style": style,
            "brewery": brewery,
            "min_abv": min_abv,
            "max_abv": max_abv,
            "limit": limit,
        }.items()
        if v is not None
    }
    return await _call("GET", "/catalog/search", params=params)


@mcp.tool()
async def recommend_beers(preference_text: str, limit: int = 5) -> dict:
    """Recommend beers from a free-text taste or occasion description."""
    return await _call(
        "POST", "/catalog/recommend", json={"preference_text": preference_text, "limit": limit}
    )


@mcp.tool()
async def get_beer(beer_id: str) -> dict:
    """Fetch a single beer by its catalog id."""
    return await _call("GET", f"/catalog/{beer_id}")


@mcp.tool()
async def submit_rating(ctx: Context, beer_id: str, rating: str, note: str | None = None) -> dict:
    """Rate a beer as the signed-in user. rating is one of: loved, fine, disliked.

    Requires a Clerk bearer token on the MCP request.
    """
    return await _call(
        "POST",
        "/ratings",
        json={"beer_id": beer_id, "rating": rating, "note": note},
        headers=_auth_headers(ctx),
    )


@mcp.tool()
async def list_my_ratings(ctx: Context, page: int = 1, page_size: int = 20) -> dict:
    """List the signed-in user's beer ratings. Requires a Clerk bearer token."""
    return await _call(
        "GET",
        "/me/ratings",
        params={"page": page, "page_size": page_size},
        headers=_auth_headers(ctx),
    )


@mcp.tool()
async def get_taste_profile(ctx: Context) -> dict:
    """Return the signed-in user's taste profile + rating history (account export).

    Requires a Clerk bearer token.
    """
    return await _call("GET", "/me/export", headers=_auth_headers(ctx))
