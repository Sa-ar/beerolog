"""Pure, LLM-free taste-archetype derivation (slice #285).

`derive_archetype(dials) -> ArchetypeKey` is total and deterministic: any valid
dial vector maps to exactly one of the closed `ArchetypeKey` set. No I/O, no
OpenAI. Both the guest-recs and baseline-load response paths call it with the
dials they already hold, so there is one source of truth and no client-side
dial math.

Derivation ladder (first rung that holds wins):
  1. High novelty appetite -> `adventurer` (the explorer overrides flavor lean).
  2. A dominant flavor family (argmax weight >= DOMINANT_FLOOR) -> its archetype,
     with hoppy splitting into `bitter-zealot` vs `hop-chaser` on bitterness.
  3. No strong flavor lean -> scalar dials pick the body/abv/bitterness type.
  4. Fallback -> `balanced-explorer` (keeps the function total).
"""

from __future__ import annotations

from app.api_contracts import ArchetypeKey, BaselineTasteDials

# A flavor family must reach this weight to count as "dominant". Below it, the
# palate has no strong lean and we fall through to the scalar-dial archetypes.
DOMINANT_FLOOR = 0.5
# Novelty appetite at/above this reads as an explorer, whatever the flavor lean.
ADVENTURER_FLOOR = 0.72
# Within a hop-forward palate, this much bitterness marks the zealot.
BITTER_ZEALOT_FLOOR = 0.7

# Fixed argmax order so ties resolve deterministically (first listed wins).
_FLAVOR_ORDER = ("hoppy", "malty", "roasty", "fruity", "sour", "smoky")

_FLAVOR_ARCHETYPE = {
    "malty": ArchetypeKey.malt_romantic,
    "roasty": ArchetypeKey.roast_devotee,
    "fruity": ArchetypeKey.fruit_forward,
    "sour": ArchetypeKey.sour_seeker,
    "smoky": ArchetypeKey.smoke_wanderer,
}


def _dominant_flavor(flavor_family: dict[str, float]) -> tuple[str, float]:
    """Argmax flavor key + weight, with a fixed-order deterministic tie-break."""
    best_key = _FLAVOR_ORDER[0]
    best_val = float(flavor_family.get(best_key, 0.0))
    for key in _FLAVOR_ORDER[1:]:
        val = float(flavor_family.get(key, 0.0))
        if val > best_val:  # strict: earlier key wins ties
            best_key, best_val = key, val
    return best_key, best_val


def derive_archetype(dials: BaselineTasteDials) -> ArchetypeKey:
    """Map dials to exactly one archetype key. Pure, total, deterministic."""
    if dials.novelty_affinity >= ADVENTURER_FLOOR:
        return ArchetypeKey.adventurer

    dominant, weight = _dominant_flavor(dials.flavor_family)
    if weight >= DOMINANT_FLOOR:
        if dominant == "hoppy":
            return (
                ArchetypeKey.bitter_zealot
                if dials.bitterness >= BITTER_ZEALOT_FLOOR
                else ArchetypeKey.hop_chaser
            )
        return _FLAVOR_ARCHETYPE[dominant]

    # No strong flavor lean: let the scalar dials pick the type.
    if dials.body >= 0.65 and dials.abv_affinity >= 0.6:
        return ArchetypeKey.heavyweight
    if dials.bitterness <= 0.4 and dials.body <= 0.45 and dials.abv_affinity <= 0.45:
        return ArchetypeKey.easy_drinker
    if dials.bitterness <= 0.45:
        return ArchetypeKey.crisp_classicist
    return ArchetypeKey.balanced_explorer
