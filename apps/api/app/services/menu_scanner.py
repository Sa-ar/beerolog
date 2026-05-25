from dataclasses import dataclass

from .fuzzy_matcher import CatalogEntry, fuzzy_match


@dataclass
class ScanResult:
    raw_text: str
    match: CatalogEntry | None
    confidence: float
    needs_review: bool


async def scan_menu(
    image_base64: str,
    catalog: list[CatalogEntry],
    llm_client,
) -> list[ScanResult]:
    names = await llm_client.extract_beer_names(image_base64)
    results: list[ScanResult] = []
    for name in names:
        matches = fuzzy_match(name, catalog)
        if matches:
            best = matches[0]
            results.append(
                ScanResult(
                    raw_text=name,
                    match=best.entry,
                    confidence=best.score,
                    needs_review=best.score < 0.85,
                )
            )
        else:
            results.append(
                ScanResult(
                    raw_text=name,
                    match=None,
                    confidence=0.0,
                    needs_review=True,
                )
            )
    return results
