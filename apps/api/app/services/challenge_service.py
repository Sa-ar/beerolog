from __future__ import annotations

import math
import time
from dataclasses import dataclass

from jose import jwt, JWTError

from app.models.flavor import FlavorVector, FLAVOR_VECTOR_DIMENSIONS

ALGORITHM = 'HS256'
DEFAULT_TTL = 7 * 24 * 3600  # 7 days
DIFF_THRESHOLD = 0.3          # abs difference to flag as notable
AGREE_THRESHOLD = 0.35        # both below this = shared low; both above (1 - this) = shared high


class ChallengeExpiredError(Exception):
    pass


def create_challenge_token(challenger_id: str, secret: str, ttl_seconds: int = DEFAULT_TTL) -> str:
    payload = {'challenger_id': challenger_id, 'exp': int(time.time()) + ttl_seconds}
    return jwt.encode(payload, secret, algorithm=ALGORITHM)


def resolve_challenge_token(token: str, secret: str) -> str:
    try:
        payload = jwt.decode(token, secret, algorithms=[ALGORITHM])
        return payload['challenger_id']
    except (JWTError, KeyError) as exc:
        raise ChallengeExpiredError('Invalid or expired challenge token') from exc


@dataclass
class VectorComparison:
    similarity: float
    shared: list[str]
    different: list[str]


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(x * x for x in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def compare_vectors(a: FlavorVector, b: FlavorVector) -> VectorComparison:
    av, bv = a.to_list(), b.to_list()
    similarity = _cosine(av, bv)

    shared: list[str] = []
    different: list[str] = []

    for dim, ai, bi in zip(FLAVOR_VECTOR_DIMENSIONS, av, bv):
        diff = abs(ai - bi)
        if diff >= DIFF_THRESHOLD:
            different.append(dim)
        elif (ai <= AGREE_THRESHOLD and bi <= AGREE_THRESHOLD) or \
             (ai >= 1 - AGREE_THRESHOLD and bi >= 1 - AGREE_THRESHOLD):
            shared.append(dim)

    return VectorComparison(similarity=similarity, shared=shared, different=different)
