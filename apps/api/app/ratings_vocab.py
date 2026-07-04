"""Single source of truth for the 3-state rating vocabulary.

Coarse-on-purpose (see docs/prds/beer-rating-feedback.md): the embedding nudge
needs direction, not magnitude. `fine` is a neutral no-op. Both the API
contracts and the repository layer import `RatingValue` from here so the
vocabulary is defined exactly once.
"""

from __future__ import annotations

from typing import Literal, get_args

RatingValue = Literal["loved", "fine", "disliked"]

# Runtime tuple of the same values, for iteration/validation.
RATING_VALUES: tuple[RatingValue, ...] = get_args(RatingValue)
