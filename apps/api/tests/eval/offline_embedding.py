"""Deterministic offline stand-in for the embedding model.

The persona harness needs vectors for text the composers produce. Calling
`text-embedding-3-large` for that would make the harness cost money, require
a key, and drift with every model revision — so offline mode projects the
composed text into the same eight axes the placeholder catalog is written in:

    0 bubbles / lightness        4 fruity
    1 bitterness / hop intensity 5 sour
    2 malty / body               6 smoky
    3 roasty                     7 novelty

The projection is a bag-of-phrases lookup over the exact sentences
`baseline_taste.compose_text` and `session_intent.compose_text` emit, so a
persona who "loves bitter drinks" lands high on axis 1 and a persona who
"prefers still, flat drinks" lands low on axis 0. It is NOT a language model
and makes no claim to be one: it is a fixed, inspectable, deterministic map
that lets the ranker be regression-tested end to end with no network.

Use `--live` on the harness to run the same personas through the real
embedding service instead.
"""

from __future__ import annotations

AXES = (
    "bubbles",
    "bitterness",
    "malty",
    "roasty",
    "fruity",
    "sour",
    "smoky",
    "novelty",
)
_AXIS_INDEX = {name: i for i, name in enumerate(AXES)}

BASE = 0.25

# Exact sentences emitted by baseline_taste.compose_text / session_intent.compose_text.
# Keeping the full sentence as the key means a phrasing change in the composer
# shows up here as a miss rather than a silently wrong vector — see
# test_offline_embedding_covers_composer_vocabulary.
PHRASE_WEIGHTS: dict[str, dict[str, float]] = {
    # --- bitterness anchors ---
    "loves bitter drinks like strong black coffee, tonic water, and grapefruit": {
        "bitterness": 0.45,
        "fruity": 0.10,
    },
    "drinks black coffee and likes real bitterness": {"bitterness": 0.35, "roasty": 0.15},
    "enjoys a little bitterness": {"bitterness": 0.10},
    "dislikes bitter flavors": {"bitterness": -0.25},
    "takes coffee with milk": {"bitterness": -0.05},
    "prefers sweet, creamy coffee": {"bitterness": -0.15, "malty": 0.10},
    "does not drink coffee": {},
    # --- roasted / chocolate ---
    "loves roasted, coffee, and dark-chocolate flavors": {"roasty": 0.55, "malty": 0.10},
    "enjoys roasted and coffee flavors": {"roasty": 0.35},
    "is neutral about roasted and coffee flavors": {},
    "prefers to avoid roasted and coffee flavors": {"roasty": -0.20},
    "strongly dislikes roasted, coffee, and dark-roast flavors": {"roasty": -0.30},
    "reaches for very dark chocolate": {"roasty": 0.20, "bitterness": 0.10},
    "enjoys dark chocolate": {"roasty": 0.12, "bitterness": 0.05},
    "prefers milk chocolate": {"malty": 0.10, "bitterness": -0.05},
    "is not a chocolate person": {},
    # --- carbonation ---
    "prefers still, flat drinks": {"bubbles": -0.25},
    "likes a little fizz": {"bubbles": 0.10},
    "loves strongly fizzy drinks": {"bubbles": 0.35},
    # --- sweetness / body ---
    "has a sweet tooth and likes rich, full-bodied flavors": {"malty": 0.40},
    "likes balanced sweetness": {"malty": 0.10},
    "prefers dry, crisp, not-sweet drinks": {"malty": -0.20, "bubbles": 0.10},
    # --- strength ---
    "wants light, easy-drinking strength": {"bubbles": 0.15, "malty": -0.10},
    "is happy with medium strength": {},
    "wants strong, intense drinks": {"malty": 0.10, "novelty": 0.10},
    # --- sour ---
    "loves sour and fermented foods (pickles, amba, sauerkraut), especially funky, wild, barnyard flavors": {
        "sour": 0.50,
        "novelty": 0.15,
    },
    "loves sour and fermented foods (pickles, amba, sauerkraut)": {"sour": 0.40},
    "is neutral about sour and fermented foods": {},
    "avoids sour and fermented foods": {"sour": -0.25},
    # --- smoke ---
    "loves smoked foods (smoked fish, BBQ, peated whisky)": {"smoky": 0.45, "roasty": 0.10},
    "is neutral about smoked foods": {},
    "avoids smoked foods": {"smoky": -0.15},
    # --- adventure ---
    "seeks out new and intense flavors": {"novelty": 0.40},
    "is open to some new flavors": {"novelty": 0.10},
    "prefers familiar and approachable flavors": {"novelty": -0.20},
    # --- session vibe anchors ---
    "Tonight lean toward crisp lagers, pilsners, wheat beers, kölsch, and light sours with bright carbonation": {
        "bubbles": 0.35,
        "bitterness": -0.10,
        "malty": -0.10,
        "novelty": -0.10,
    },
    "Tonight lean toward stouts, porters, brown ales, barleywines, and warming malty beers with depth": {
        "malty": 0.40,
        "roasty": 0.45,
        "bubbles": -0.20,
    },
    "Tonight lean toward barrel-aged beers, mixed-fermentation, imperial styles, sours, and unusual limited releases": {
        "novelty": 0.50,
        "sour": 0.30,
        "bitterness": 0.15,
    },
    "Tonight lean toward mainstream lagers, classic pale ales, well-known imports, and approachable crowd-pleasers": {
        "novelty": -0.25,
        "bubbles": 0.15,
    },
}

# Flavor cues, matched only inside the "Tastes that feel like them:" sentence.
CUE_WEIGHTS: dict[str, dict[str, float]] = {
    "grapefruit": {"fruity": 0.30, "bitterness": 0.15},
    "pine": {"bitterness": 0.20, "fruity": 0.05},
    "tropical fruit": {"fruity": 0.30},
    "citrus zest": {"fruity": 0.25},
    "caramel": {"malty": 0.25},
    "bread crust": {"malty": 0.25},
    "banana bread": {"malty": 0.20, "fruity": 0.10},
    "roasted coffee": {"roasty": 0.25},
}

# CATA "puts them off" cues, matched only inside the "Puts them off:" sentence.
AVOID_WEIGHTS: dict[str, dict[str, float]] = {
    "too bitter": {"bitterness": -0.25},
    "too dark": {"roasty": -0.20},
    "too heavy": {"malty": -0.25},
    "too sweet": {"malty": -0.15},
}

_CUE_MARKER = "Tastes that feel like them:"
_AVOID_MARKER = "Puts them off:"


def _clamp(x: float) -> float:
    return max(0.0, min(1.0, x))


def project(text: str) -> list[float]:
    """Project composed preference text into the catalog's 8 axes."""
    vec = [BASE] * len(AXES)

    def apply(deltas: dict[str, float]) -> None:
        for axis, delta in deltas.items():
            vec[_AXIS_INDEX[axis]] += delta

    haystack = text
    # Longest first so "loves sour ... especially funky" wins over its prefix.
    for phrase in sorted(PHRASE_WEIGHTS, key=len, reverse=True):
        if phrase in haystack:
            apply(PHRASE_WEIGHTS[phrase])
            haystack = haystack.replace(phrase, "")

    if _CUE_MARKER in text:
        segment = text.split(_CUE_MARKER, 1)[1].split(".")[0]
        for cue, deltas in CUE_WEIGHTS.items():
            if cue in segment:
                apply(deltas)

    if _AVOID_MARKER in text:
        segment = text.split(_AVOID_MARKER, 1)[1].split(".")[0]
        for cue, deltas in AVOID_WEIGHTS.items():
            if cue in segment:
                apply(deltas)

    return [_clamp(v) for v in vec]


class OfflineEmbeddingClient:
    """Satisfies the EmbeddingClient protocol without any network call."""

    async def embed(self, text: str) -> list[float]:
        return project(text)
