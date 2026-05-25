from app.models.flavor import FLAVOR_VECTOR_DIMENSIONS, FlavorVector

_FALLBACK = "A solid pick based on your taste profile."


def _build_prompt(vector: FlavorVector, beers: list[dict]) -> str:
    dims = ", ".join(f"{d}={getattr(vector, d):.2f}" for d in FLAVOR_VECTOR_DIMENSIONS)
    beer_lines = "\n".join(
        f"- id={b['id']}, name={b['name']} ({b['style']}), vector={b['flavor_vector']}"
        for b in beers
    )
    return (
        f"A beer drinker has this taste profile: [{dims}].\n"
        f"Write one confident, specific sentence explaining why each beer below is a great (or interesting) pick for them.\n"
        f'Tone: direct and enthusiastic — say "This is a strong pick" not "You might enjoy".\n'
        f"Format each line exactly as: <id>: <sentence>\n\n"
        f"{beer_lines}"
    )


def _parse_response(text: str, beers: list[dict]) -> dict[str, str]:
    result: dict[str, str] = {}
    for line in text.strip().splitlines():
        if ":" in line:
            beer_id, _, explanation = line.partition(":")
            beer_id = beer_id.strip()
            explanation = explanation.strip()
            if beer_id and explanation:
                result[beer_id] = explanation
    # ensure every beer has an entry
    for b in beers:
        if b["id"] not in result:
            result[b["id"]] = _FALLBACK
    return result


async def generate_explanations(
    vector: FlavorVector,
    beers: list[dict],
    llm_client,
) -> dict[str, str]:
    if not beers:
        return {}
    try:
        response = await llm_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": _build_prompt(vector, beers)}],
            max_tokens=300,
            temperature=0.7,
        )
        text = response.choices[0].message.content or ""
        return _parse_response(text, beers)
    except Exception:
        return {b["id"]: _FALLBACK for b in beers}
