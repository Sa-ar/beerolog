from __future__ import annotations

import re

_UNSAFE_PATTERNS = (
    re.compile(r"<script", re.IGNORECASE),
    re.compile(r"javascript:", re.IGNORECASE),
    re.compile(r"\bon\w+\s*=", re.IGNORECASE),
)


class InvalidSvgError(ValueError):
    pass


def validate_svg(svg: str) -> str:
    """Reject unsafe or malformed SVG markup."""

    trimmed = svg.strip()
    if "<svg" not in trimmed.lower():
        raise InvalidSvgError("SVG must contain a root <svg> element")

    for pattern in _UNSAFE_PATTERNS:
        if pattern.search(trimmed):
            raise InvalidSvgError(f"Unsafe SVG content matched: {pattern.pattern}")

    return trimmed
