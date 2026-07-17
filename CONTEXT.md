# Beerolog Context

## Product

Beerolog helps a person learn their taste, get strong beer recommendations, and refine their profile over time.

## Supported MVP

- The supported runtime surface is the signed-in solo flow.
- A user can sign in, complete the quiz, scan a bar menu, get catalog or menu-scoped recommendations (optionally session-scoped via vibe/ABV intent), rate beers, and keep an evolving taste profile.
- Core in-scope systems are auth, menu photo scan (`/menu`), profile, recommendations, ratings/history, and persona.
- Managed venue QR / tap-list operator workflows remain deferred (see ADR 0001 and `docs/prds/venue-and-menu-scan.md`).

## Deferred surfaces

- Venue QR, managed tap-list, and operator workflows
- Group sessions
- Friend challenges and taste comparison
- Leaderboards and social proof
- Badges and milestone systems
- Broader bar tooling and operator workflows

## Core terms

| Term | Meaning |
|---|---|
| `BaselineTaste` | The persisted, slowly-evolving taste profile of a user. Composed of explicit dials (bubbles, bitterness, multi-axis flavor-family) plus a `NoveltyAffinity` modifier, seeded by onboarding, plus a derived embedding that updates as the user rates beers. The dials remain user-editable; the embedding is internal and drives similarity search. The embedding is **persisted per user** (not recomputed per recommendation) and refreshed on dial change, on new rating, or after a staleness window (default 7 days). |
| `NoveltyAffinity` | A user-level modifier on `BaselineTaste` capturing whether the user seeks new/intense flavors or sticks with familiar ones. Sourced from onboarding ("do you seek new flavors or what you know?"). **Not a taste dial — a modulator on how taste dials map to beer recommendations.** Motivated by Higgins & Hayes 2020 (single Penn State study, n≈109, **unreplicated** as of this writing) which found bitterness perception inverts as a predictor of hop-forward beer preference without a sensation-seeking signal. Treated as a tunable prior, not an established law — instrumented in production to test whether the interaction actually moves rating outcomes. |
| `OnboardingQuiz` | The ~30-second non-beer-language quiz that seeds `BaselineTaste`. Asks the user about coffee, sparkling water, snacks, sour/smoky/citrus food preferences — never about beer styles. Answers compose into a synthetic preference text that is embedded with the multilingual model to produce the initial `BaselineTaste` embedding. Questions tagged `evidence-backed` form the load-bearing core; `hypothesis` questions are signal-adders to be A/B-validated against rating data. |
| `Match` | The runtime act of producing a `Recommendation`. Two stages: **(1) candidate retrieval** — a weighted blend of cosine similarity against `BaselineTaste`'s embedding and against an embedding of the current `SessionIntent`, scored as `α · cos(baseline, beer) + (1−α) · cos(session, beer)` with default `α = 0.6`. **(2) novelty re-rank** — candidate scores are adjusted by `β · (NoveltyAffinity − 0.5) · beer.adventurousness` with default `β = 0.3`. Top-K returned. Both `α` and `β` are tunable, not fixed. |
| `Adventurousness` | A 0–1 score on each `Beer` capturing how unusual or intense it is, used by the novelty re-rank in `Match`. Computed at seed time from `marketTier`, style rarity in the catalog, and ABV intensity. A standard Goldstar lager scores near 0; a smoked imperial stout from a brewpub scores near 1. Independent of quality — high adventurousness does not mean "better." |
| `SessionIntent` | The ephemeral, single-occasion expression of what a user wants to drink *right now*. Captured at the start of a drinking session via two quick-picks (`vibe`: refreshing / cozy / adventurous / familiar; `ABV intent`: low / medium / high / don't care) plus an optional free-text "tell me more" box. The three inputs compose into a synthetic preference text that is embedded with the multilingual model and used as the session-side query vector in `Match`. Discarded at session end. |
| `Recommendation` | A ranked beer result derived from a user's `BaselineTaste` combined with their current `SessionIntent`, matched against the catalog. Replaces the prior menu-scoped definition. Each recommendation ships with the `Beer`'s display fields plus a one-line **why-this-beer** explanation derived deterministically from which contributor (`α`-baseline, `(1−α)`-session, or `β`-novelty re-rank) dominated the score. Default count returned: top 5. |
| `User profile` | The persisted signed-in state for `BaselineTaste`, rating history, and `Persona`. |
| `Beer history` | The beers a signed-in user has rated over time. Stored from day one. Wiring into `BaselineTaste` embedding updates is now active — see [[rating-feedback-loop]] (`docs/adr/0006-rating-feedback-loop.md`). |
| `Rating` | A 1–5 star score a user gives a `Beer` they actually drank. Stored alongside `userId`, `beerId`, optional free-text note, and timestamp. Captured day one; used immediately for persona evaluation and persisted for later use in the learning loop. |
| `Persona` | A readable label derived from the current `BaselineTaste` (e.g. "hoppy explorer", "easy-drinker"). |
| `Beer` | A single beer SKU in the catalog — one row per recipe. The recommendation target. Carries style, brewery, tasting attributes, and a `marketTier`. Format (bottle / draft / can), batch, and venue availability are intentionally **not** modelled in this stage — see [[serve-style-and-availability-deferred]]. |
| `MarketTier` | A non-style category on `Beer` capturing where it sits in the Israeli beer market: `mainstream` (industrial, broadly distributed — Goldstar, Maccabee, Carlsberg-IL, Tuborg-IL), `craft` (Israeli craft breweries — Alexander, Malka, Herzl, BeerBazaar, Negev, Jem's, Schnitt, etc.), `import` (foreign beers commonly stocked in Israel). Independent of style. Brewpub-exclusivity (e.g. Schnitt's beers only exist at Schnitt the pub) is an **availability** concern, not a tier. |
| `TastingNotes` | A short (1–3 sentence) flavor description of a `Beer`, in either Hebrew or English. Sourced from the brewery's own materials when possible; synthetically generated from `(style, ABV, brewery)` when not, and flagged `notesSource: synthetic` so it can be replaced later. Feeds the `BeerEmbedding`. |
| `BeerEmbedding` | The vector representation of a `Beer` used for similarity matching. Derived from a deterministic concatenation of all available beer fields — `style`, `brewery`, `breweryCountry`, `abv`, `ibu`, `hops`, `malts`, `yeast`, `color`, `body`, `sweetness`, `tastingNotes` — with optional clauses silently dropped when fields are null. Embedded with a multilingual model so Hebrew and English text live in the same space. Hop and malt names carry strong semantic signal independent of `tastingNotes`. Re-embedding the whole catalog is required if the model changes or the composition template changes. |
| `Venue` | A physical place a `Beer` can be obtained: a bottle shop (off-premise) or a pub/bar (on-premise). Located by free-text city/area, not coordinates. Distinct from a scanned bar menu: a `Venue` is a durable, shareable place record; a menu scan is one user's transient capture. |
| `Availability` | A claim that a `Venue` *generally carries* a `Beer` as part of its regular range — never a live in-stock count. Carries a confidence that decays over months and is refreshed by re-scrapes and user reports. |
| `AvailabilityReport` | A user's Waze-style assertion about an `Availability`: confirm ("still here"), deny ("gone"), or add (a `Venue`/`Beer` pairing we didn't have). Adjusts confidence and freshness; weighted by reporter trust. |

## Repo shape

- `apps/web`: TanStack Start frontend
- `apps/api`: FastAPI backend
- `packages/db`: Drizzle schema and migrations
- `packages/types`: Shared TypeScript contracts
- `packages/ui`: Shared UI components

## Workflow artifacts

- `CONTEXT.md`: shared product language and boundary
- `docs/adr/`: durable architectural and scope decisions
- `docs/prds/`: feature-level requirements and test intent
- `docs/issues/`: local vertical slices derived from an approved PRD
- `docs/ops/`: durable environment matrix, operator checklists, and release evidence records
