"""Maps a persisted ``abv_affinity`` dial (0..1) to an :class:`AbvIntent` band.

ABV is a constraint, not a flavor-similarity axis (ADR-0005): the band feeds the
matcher's ABV term as a soft default when a session sets no explicit ABV intent.
Thresholds mirror ``dialDescriptor`` in the web app (<0.35 low / >0.65 high).
"""

from __future__ import annotations

from app.api_contracts import AbvIntent


def band_for_affinity(affinity: float) -> AbvIntent:
    if affinity < 0.35:
        return AbvIntent.low
    if affinity > 0.65:
        return AbvIntent.high
    return AbvIntent.medium
