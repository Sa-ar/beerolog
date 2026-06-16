import re
from pathlib import Path

from app.main import app
from app.models.flavor import FLAVOR_VECTOR_DIMENSIONS, FLAVOR_VECTOR_SCHEMA_VERSION
from app.services.persona_service import PERSONAS


def test_openapi_exposes_stable_contract_shapes():
    schema = app.openapi()

    assert schema["paths"]["/users/me/rate"]["post"]["operationId"] == "rateMyBeer"

    rate_request = schema["components"]["schemas"]["RateBeerRequest"]
    assert rate_request["properties"]["beer"]["$ref"] == "#/components/schemas/RatedBeerInput"

    rating_value = schema["components"]["schemas"]["RatingValue"]
    assert rating_value["enum"] == ["loved", "fine", "disliked"]

    assert "/venues/{venue_id}/tap-list" not in schema["paths"]
    assert "/venues/{venue_id}/scan" not in schema["paths"]
    assert "/scan/{token}" not in schema["paths"]
    assert "/venues/{venue_id}/leaderboard" not in schema["paths"]
    assert "/sessions" not in schema["paths"]
    assert "/sessions/{session_id}/join" not in schema["paths"]
    assert "/sessions/{session_id}/submit" not in schema["paths"]
    assert "/sessions/{session_id}/status" not in schema["paths"]
    assert "/sessions/{session_id}/recommend" not in schema["paths"]
    assert "/challenges" not in schema["paths"]
    assert "/challenges/{token}/compare" not in schema["paths"]
    assert schema["paths"]["/menu/scan"]["post"]["operationId"] == "scanMenu"


def test_typescript_contract_constants_match_api_flavor_model():
    source = Path(__file__).resolve().parents[3] / "packages/types/src/index.ts"
    text = source.read_text()

    dims_match = re.search(
        r"export const FLAVOR_VECTOR_DIMENSIONS = \[(.*?)\] as const",
        text,
        re.DOTALL,
    )
    assert dims_match is not None
    dims = tuple(re.findall(r"'([^']+)'", dims_match.group(1)))
    assert dims == FLAVOR_VECTOR_DIMENSIONS

    version_match = re.search(
        r"export const FLAVOR_VECTOR_SCHEMA_VERSION = (\d+) as const",
        text,
    )
    assert version_match is not None
    assert int(version_match.group(1)) == FLAVOR_VECTOR_SCHEMA_VERSION

    rating_match = re.search(r"export type Rating = ([^\n]+)", text)
    assert rating_match is not None
    assert re.findall(r"'([^']+)'", rating_match.group(1)) == ["loved", "fine", "disliked"]


def test_typescript_persona_ids_match_api_personas():
    source = Path(__file__).resolve().parents[3] / "packages/types/src/index.ts"
    text = source.read_text()

    persona_match = re.search(
        r"export type PersonaId =\n((?:\s+\| '[^']+'\n)+)",
        text,
    )
    assert persona_match is not None
    persona_ids = re.findall(r"'([^']+)'", persona_match.group(1))
    assert persona_ids == [persona.id for persona in PERSONAS]


def test_web_catalog_uses_seed_defined_beer_ids():
    source = Path(__file__).resolve().parents[3] / "apps/web/src/lib/catalog.ts"
    text = source.read_text()

    assert "return beer.id" in text
