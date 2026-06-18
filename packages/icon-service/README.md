# beerolog-icon-service

Portable Python package for GPT-generated SVG icons with purpose-based reuse.

## Modules

- `taste_profile` — maps baseline taste dials to canonical purpose keys
- `service` — `get_or_create_icon`, `resolve_taste_profile_icons`
- `generator` — `GPTIconGenerator` (OpenAI chat completion)
- `validate` — SVG safety checks

## Tests

```bash
uv run pytest
```
