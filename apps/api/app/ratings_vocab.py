"""Single source of truth for the rating vocabulary.

Coarse-on-purpose (see docs/prds/beer-rating-feedback.md): the embedding nudge
needs direction, not magnitude. `fine` is a neutral no-op. `unknown` ("I don't
know this beer", #219) is also a taste no-op — it records that the beer was
seen so it drops out of future decks, but never nudges the profile. Both the
API contracts and the repository layer import `RatingValue` from here so the
vocabulary is defined exactly once.
"""

from __future__ import annotations

from typing import Literal, get_args

RatingValue = Literal["loved", "fine", "disliked", "unknown"]

# Runtime tuple of the same values, for iteration/validation.
RATING_VALUES: tuple[RatingValue, ...] = get_args(RatingValue)
