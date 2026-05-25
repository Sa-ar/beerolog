from __future__ import annotations
import math
from dataclasses import dataclass
from app.models.flavor import FlavorVector

# [bitterness, sweetness, fruitiness, roast, sourness, body, adventure]

@dataclass(frozen=True)
class Persona:
    id: str
    name: str
    icon: str
    description: str
    centroid: list[float]


PERSONAS: list[Persona] = [
    Persona(
        id='easy_sipper',
        name='The Easy Sipper',
        icon='🌊',
        description='You want something cold, clean, and effortless. Life is too short for complicated beer.',
        centroid=[0.15, 0.1, 0.1, 0.0, 0.0, 0.2, 0.15],
    ),
    Persona(
        id='hop_head',
        name='The Hop Head',
        icon='🌿',
        description='Bitter is better. You chase citrus, pine, and tropical aromas like a hobby.',
        centroid=[0.9, 0.1, 0.85, 0.1, 0.1, 0.55, 0.8],
    ),
    Persona(
        id='dark_side',
        name='The Dark Side',
        icon='🌑',
        description='Coffee, chocolate, and midnight — you prefer your beer like your soul: deep and roasty.',
        centroid=[0.45, 0.35, 0.1, 0.95, 0.0, 0.9, 0.3],
    ),
    Persona(
        id='sour_seeker',
        name='The Sour Seeker',
        icon='🍋',
        description='Tart, funky, and refreshingly weird. You like your beer to taste like a dare.',
        centroid=[0.05, 0.2, 0.7, 0.0, 0.95, 0.35, 0.55],
    ),
    Persona(
        id='sweet_tooth',
        name='The Sweet Tooth',
        icon='🍯',
        description='Caramel, toffee, and a little warmth. You like beer that feels like a hug.',
        centroid=[0.3, 0.8, 0.25, 0.3, 0.05, 0.6, 0.35],
    ),
    Persona(
        id='balanced',
        name='The Balanced Drinker',
        icon='⚖️',
        description='You appreciate everything in moderation. The ideal beer fits any mood.',
        centroid=[0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
    ),
    Persona(
        id='adventurer',
        name='The Adventurer',
        icon='🎲',
        description='You want something you\'ve never tried. Surprise is the whole point.',
        centroid=[0.55, 0.4, 0.6, 0.4, 0.4, 0.5, 0.95],
    ),
    Persona(
        id='classic',
        name='The Classic',
        icon='🏔️',
        description='You know what you like and you like what you know. Reliability beats novelty.',
        centroid=[0.25, 0.3, 0.2, 0.15, 0.05, 0.4, 0.1],
    ),
    Persona(
        id='roast_master',
        name='The Roast Master',
        icon='☕',
        description='Espresso at 8am, stout at 8pm. Roast is a lifestyle choice for you.',
        centroid=[0.5, 0.3, 0.15, 1.0, 0.05, 0.85, 0.4],
    ),
    Persona(
        id='fruit_stand',
        name='The Fruit Stand',
        icon='🍑',
        description='Peach, mango, raspberry — you want fruit-forward flavors that don\'t punch back.',
        centroid=[0.15, 0.3, 0.9, 0.05, 0.2, 0.35, 0.5],
    ),
]


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(x * x for x in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def classify_persona(vector: FlavorVector) -> Persona:
    v = vector.to_list()
    return max(PERSONAS, key=lambda p: _cosine(v, p.centroid))
