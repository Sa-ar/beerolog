from pydantic import BaseModel, field_validator

# Canonical dimension order — must match packages/types FLAVOR_VECTOR_DIMENSIONS.
FLAVOR_VECTOR_DIMENSIONS = (
    "bitterness",
    "sweetness",
    "fruitiness",
    "roast",
    "sourness",
    "body",
    "adventure",
)
FLAVOR_VECTOR_SCHEMA_VERSION = 1


class FlavorVector(BaseModel):
    bitterness: float
    sweetness: float
    fruitiness: float
    roast: float
    sourness: float
    body: float
    adventure: float

    @field_validator("*", mode="before")
    @classmethod
    def clamp(cls, v: float) -> float:
        return max(0.0, min(1.0, float(v)))

    def to_list(self) -> list[float]:
        return [getattr(self, dim) for dim in FLAVOR_VECTOR_DIMENSIONS]

    def to_text(self) -> str:
        """Textual representation used for embedding."""
        parts = [
            f"bitterness {self.bitterness:.2f}",
            f"sweetness {self.sweetness:.2f}",
            f"fruitiness {self.fruitiness:.2f}",
            f"roast {self.roast:.2f}",
            f"sourness {self.sourness:.2f}",
            f"body {self.body:.2f}",
            f"adventure {self.adventure:.2f}",
        ]
        return "Beer taste profile: " + ", ".join(parts)

    @classmethod
    def from_list(cls, values: list[float]) -> "FlavorVector":
        if len(values) != len(FLAVOR_VECTOR_DIMENSIONS):
            raise ValueError(f"Expected {len(FLAVOR_VECTOR_DIMENSIONS)} values, got {len(values)}")
        return cls(**dict(zip(FLAVOR_VECTOR_DIMENSIONS, values, strict=True)))

    @classmethod
    def neutral(cls) -> "FlavorVector":
        return cls(**{dim: 0.5 for dim in FLAVOR_VECTOR_DIMENSIONS})
