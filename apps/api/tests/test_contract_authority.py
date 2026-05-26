import re
from pathlib import Path

from app.main import app
from app.models.flavor import FLAVOR_VECTOR_DIMENSIONS, FLAVOR_VECTOR_SCHEMA_VERSION


def test_openapi_exposes_stable_contract_shapes():
    schema = app.openapi()

    assert schema["paths"]["/users/me/rate"]["post"]["operationId"] == "rateMyBeer"
    assert schema["paths"]["/sessions"]["post"]["operationId"] == "createSession"
    assert (
        schema["paths"]["/challenges/{token}/compare"]["post"]["operationId"] == "compareChallenge"
    )

    rate_request = schema["components"]["schemas"]["RateBeerRequest"]
    assert rate_request["properties"]["beer"]["$ref"] == "#/components/schemas/RatedBeerInput"

    scan_request = schema["components"]["schemas"]["ScanMenuRequest"]
    assert (
        scan_request["properties"]["catalog"]["items"]["$ref"]
        == "#/components/schemas/ScanCatalogEntry"
    )

    rating_value = schema["components"]["schemas"]["RatingValue"]
    assert rating_value["enum"] == ["loved", "fine", "disliked"]

    compare_response = schema["paths"]["/challenges/{token}/compare"]["post"]["responses"]["200"][
        "content"
    ]["application/json"]["schema"]["$ref"]
    assert compare_response == "#/components/schemas/ChallengeComparisonResponse"


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
