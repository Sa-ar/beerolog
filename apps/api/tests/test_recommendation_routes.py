from types import SimpleNamespace
from unittest.mock import AsyncMock

from fastapi.testclient import TestClient

from app.dependencies import get_llm_client
from app.main import app


def _beer(id: str, **dims) -> dict:
    defaults = {
        "bitterness": 0.5,
        "sweetness": 0.5,
        "fruitiness": 0.5,
        "roast": 0.5,
        "sourness": 0.5,
        "body": 0.5,
        "adventure": 0.5,
    }
    defaults.update(dims)
    return {
        "id": id,
        "name": id.title(),
        "brewery": "Test Brewery",
        "style": "lager",
        "flavor_vector": [
            defaults["bitterness"],
            defaults["sweetness"],
            defaults["fruitiness"],
            defaults["roast"],
            defaults["sourness"],
            defaults["body"],
            defaults["adventure"],
        ],
        "description": f"{id.title()} description",
    }


LAGER = _beer(
    "lager",
    bitterness=0.1,
    sweetness=0.2,
    fruitiness=0.1,
    roast=0.0,
    sourness=0.0,
    body=0.2,
)
IPA = _beer(
    "ipa",
    bitterness=0.9,
    sweetness=0.1,
    fruitiness=0.7,
    roast=0.1,
    sourness=0.1,
    body=0.5,
    adventure=0.7,
)
STOUT = _beer(
    "stout",
    bitterness=0.5,
    sweetness=0.3,
    fruitiness=0.1,
    roast=0.9,
    sourness=0.0,
    body=0.9,
    adventure=0.8,
)


def make_client(llm_create=None):
    create = llm_create or AsyncMock(
        return_value=SimpleNamespace(
            choices=[
                SimpleNamespace(
                    message=SimpleNamespace(
                        content="\n".join(
                            [
                                "lager: Crisp and easy-drinking for this profile.",
                                "ipa: A bolder backup with extra hop bite.",
                                "stout: The adventurous dark option for a richer mood.",
                            ]
                        )
                    )
                )
            ]
        )
    )
    llm = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create)))
    app.dependency_overrides[get_llm_client] = lambda: llm
    return TestClient(app)


def test_recommendations_returns_ranked_slots_from_api():
    client = make_client()

    resp = client.post(
        "/recommendations/",
        json={
            "taste_vector": {
                "bitterness": 0.1,
                "sweetness": 0.2,
                "fruitiness": 0.1,
                "roast": 0.0,
                "sourness": 0.0,
                "body": 0.2,
                "adventure": 0.3,
            },
            "beers": [LAGER, IPA, STOUT],
        },
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["best"]["id"] == "lager"
    assert data["backup"]["id"] == "ipa"
    assert data["adventurous"]["id"] == "stout"
    assert data["explanations"]["lager"]


def test_recommendations_returns_422_for_empty_catalog():
    client = make_client()

    resp = client.post(
        "/recommendations/",
        json={
            "taste_vector": {
                "bitterness": 0.1,
                "sweetness": 0.2,
                "fruitiness": 0.1,
                "roast": 0.0,
                "sourness": 0.0,
                "body": 0.2,
                "adventure": 0.3,
            },
            "beers": [],
        },
    )

    assert resp.status_code == 422
    assert resp.json()["detail"] == "No beers provided"


def test_recommendations_fall_back_when_llm_fails():
    client = make_client(llm_create=AsyncMock(side_effect=RuntimeError("boom")))

    resp = client.post(
        "/recommendations/",
        json={
            "taste_vector": {
                "bitterness": 0.1,
                "sweetness": 0.2,
                "fruitiness": 0.1,
                "roast": 0.0,
                "sourness": 0.0,
                "body": 0.2,
                "adventure": 0.3,
            },
            "beers": [LAGER, IPA, STOUT],
        },
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["explanations"]["lager"] == "A solid pick based on your taste profile."
