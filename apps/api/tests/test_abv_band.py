from app.api_contracts import AbvIntent
from app.services.abv_band import band_for_affinity


def test_low_affinity_maps_to_low() -> None:
    assert band_for_affinity(0.2) == AbvIntent.low


def test_mid_affinity_maps_to_medium() -> None:
    assert band_for_affinity(0.5) == AbvIntent.medium


def test_high_affinity_maps_to_high() -> None:
    assert band_for_affinity(0.8) == AbvIntent.high


def test_thresholds_are_inclusive_of_the_middle_band() -> None:
    assert band_for_affinity(0.34) == AbvIntent.low
    assert band_for_affinity(0.35) == AbvIntent.medium
    assert band_for_affinity(0.65) == AbvIntent.medium
    assert band_for_affinity(0.66) == AbvIntent.high
