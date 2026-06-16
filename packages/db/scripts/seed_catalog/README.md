# Seed catalog pipeline (slice #75)

Framework that takes per-brewery scraped records and produces a real
~150-beer Israeli catalog. **The framework, pure substeps, and tests
ship in this PR.** The per-brewery scrapers and the LLM-fallback
note synthesiser are flagged HITL — see below.

## Layout

- `normalise_row.ts` — pure: scraped record → normalised Beer schema row
- `adventurousness.ts` — pure: `(beer, catalog) → 0..1` adventurousness
- `compose_text.ts` — pure: deterministic embedding-source string
- `__tests__/` — vitest suite over the pure substeps
- `scrapers/` — *(HITL)* per-brewery scrapers, one file each. Stubbed.
- `synthesise_notes.ts` — *(HITL)* LLM fallback for missing tasting notes
- `run.ts` — *(HITL)* top-level orchestrator

## What's HITL and why

**Per-brewery scrapers.** Each Israeli brewery's site has its own
structure, Hebrew-only or mixed-language content, paywall / JS-rendered
pages. Choosing CSS selectors, handling cookie banners, and recovering
from rate limits are decisions that don't compose cleanly with
autonomous edits. A maintainer with a browser open is the right tool.

**Synthetic note generation.** Calling an LLM to write tasting notes
for beers without published notes is straightforward, but the prompt
should reflect the actual style + brewery vocabulary used in the
Israeli market — worth one human pass before locking the prompt.

**Per-row spot-check.** PRD acceptance criteria §10: “Human spot-check
pass on the generated CSV/markdown report.” Slated for the maintainer
who runs the pipeline.

## How to extend (when picking up the HITL portion)

1. Add a per-brewery scraper under `scrapers/<brewery>.ts` exporting an
   async `scrape(): Promise<ScrapedBeer[]>`.
2. Register it in `run.ts`.
3. Run `pnpm --filter @beerolog/db seed:catalog --reset` against a
   fresh DB to populate `beers`.
4. The script writes a `seed-report.md` summary; review it before
   merging the resulting `beers-catalog.json` snapshot.

## Hooking up new sources

The pure substeps don't care where a `ScrapedBeer` came from — a
Greasemonkey-style copy/paste from a brewery page is just as valid as
a full HTTP scrape. For breweries with thin web presence, hand-curated
`scrapers/<brewery>.ts` files that return literals are fine.
