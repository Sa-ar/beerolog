# Beerolog Context

## Product

Beerolog helps a person learn their taste, get strong beer recommendations, and refine their profile over time.

## Business model

The B2C app (beerolog.com) is a thin shell kept alive at minimal cost — same codebase, no dedicated investment. It has limited traction and is not the primary growth vector.

The primary business is a **paid white-label B2B product**: bars and venues license Beerolog's recommendation engine under their own brand. The white-label subscription is a single paid tier — all analytics (descriptive now, predictive at network scale) are included. There is no free tier for venues.

## Supported MVP

- The supported runtime surface is the signed-in solo flow.
- A user can sign in, complete the quiz, scan a bar menu, get catalog or menu-scoped recommendations (optionally session-scoped via vibe/ABV intent), rate beers, and keep an evolving taste profile.
- Core in-scope systems are auth, menu photo scan (`/menu`), profile, recommendations, ratings/history, and persona.
- Managed venue QR / tap-list operator workflows remain deferred (see ADR 0001).

## Deferred surfaces

- Venue QR, managed tap-list, and operator workflows
- Group sessions
- Friend challenges and taste comparison
- Leaderboards and social proof
- Badges and milestone systems
- Broader bar tooling and operator workflows
- Cross-category drink upsells (beer → cocktail / wine) — deferred until non-beer flavor catalog exists
- B2B bar intelligence predictive analytics (cross-venue benchmarks, stocking recommendations) — included in white-label subscription but deferred until network scale exists (10+ active partner bars); descriptive analytics ship with the staff portal
- White-label multi-tenancy, international markets, and per-market configuration — seams designed in now (see ADR 0009); full multi-market operations deferred
- User taste profile portability / white-label sharing — resolved: cold start at every venue, no cross-tenant profile portability in v1 (see OD-001 in `docs/prds/open-decisions.md`)

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
| `Catch` | A `Rating` a user has finalized with `Proof`. The `Rating` is the base ("I drank this"); attaching `Proof` upgrades it to a Catch ("I drank this and here is evidence"). A `Rating` without `Proof` is not a Catch. Inherits the one-per-user-per-`Beer` uniqueness of `Rating`. _Avoid_: check-in, log, unlock. |
| `Proof` | The evidence a user attaches to a `Rating` to finalize a `Catch`. v1 is a single user-submitted photo of the actual glass/bottle, accepted on the honor system — **presence of a photo is required; its content is not verified**. Its job is authenticity and share appeal, not anti-fraud. Carries a `ProofSource`. See [[adr-0011-catch-proof-by-presence]]. |
| `ProofSource` | A discriminator on `Proof` recording how strongly presence was established. `self_photo` (user photo, honor system) is the only built value in v1. `venue_verified` (a venue-issued presence signal — QR / receipt code — under white-label) is reserved as a seam and deferred. Verification strength is a function of context; under white-label the tenant issues the signal, attaches the reward, and owns the fraud risk. |
| `CatchCollection` | A user's personal, unbounded grid of every `Beer` they have Caught. Always growing, never "complete". The Pokédex metaphor stays a metaphor, not domain language. _Avoid_: "collection" unqualified (ambiguous with `Set`), "Pokédex" (metaphor only). |
| `Set` | A finite, curated, completable group of `Beer`s (e.g. "Israeli Craft Starter", or a white-label tenant's tap list). Catching every `Beer` in a Set is a shareable milestone ("catch 'em all"). The Set is the white-label promo mechanic: a tenant defines a Set and attaches a reward. Distinct from `CatchCollection` (personal, unbounded). _Avoid_: calling a Set a "collection". |
| `Persona` | A readable label derived from the current `BaselineTaste` (e.g. "hoppy explorer", "easy-drinker"). |
| `Beer` | A single beer SKU in the catalog — one row per recipe. The recommendation target. Carries style, brewery, tasting attributes, and a `marketTier`. Format (bottle / draft / can), batch, and venue availability are intentionally **not** modelled in this stage — see [[serve-style-and-availability-deferred]]. |
| `MarketTier` | A non-style category on `Beer` capturing where it sits in the Israeli beer market: `mainstream` (industrial, broadly distributed — Goldstar, Maccabee, Carlsberg-IL, Tuborg-IL), `craft` (Israeli craft breweries — Alexander, Malka, Herzl, BeerBazaar, Negev, Jem's, Schnitt, etc.), `import` (foreign beers commonly stocked in Israel). Independent of style. Brewpub-exclusivity (e.g. Schnitt's beers only exist at Schnitt the pub) is an **availability** concern, not a tier. |
| `TastingNotes` | A short (1–3 sentence) flavor description of a `Beer`, in either Hebrew or English. Sourced from the brewery's own materials when possible; synthetically generated from `(style, ABV, brewery)` when not, and flagged `notesSource: synthetic` so it can be replaced later. Feeds the `BeerEmbedding`. |
| `BeerEmbedding` | The vector representation of a `Beer` used for similarity matching. Derived from a deterministic concatenation of all available beer fields — `style`, `brewery`, `breweryCountry`, `abv`, `ibu`, `hops`, `malts`, `yeast`, `color`, `body`, `sweetness`, `tastingNotes` — with optional clauses silently dropped when fields are null. Embedded with a multilingual model so Hebrew and English text live in the same space. Hop and malt names carry strong semantic signal independent of `tastingNotes`. Re-embedding the whole catalog is required if the model changes or the composition template changes. |
| `Venue` | A physical place a `Beer` can be obtained: a bottle shop (off-premise) or a pub/bar (on-premise). Located by free-text city/area, not coordinates. Distinct from a scanned bar menu: a `Venue` is a durable, shareable place record; a menu scan is one user's transient capture. |
| `Availability` | A claim that a `Venue` *generally carries* a `Beer` as part of its regular range — never a live in-stock count. Carries a confidence that decays over months and is refreshed by re-scrapes and user reports. |
| `AvailabilityReport` | A user's Waze-style assertion about an `Availability`: confirm ("still here"), deny ("gone"), or add (a `Venue`/`Beer` pairing we didn't have). Adjusts confidence and freshness; weighted by reporter trust. |
| `Market` | A country-level partition of the shared catalog. Every `Beer` and `Venue` belongs to one or more markets via a `beer_market_availability` join. Recommendations are filtered to the user's active market. Designed as a seam from the start so multi-market operations require data and config changes, not schema rewrites. See ADR 0009. |
| `CatalogItem` | The generalised form of `Beer` in a shared product DB — includes non-beer items (cocktails, spirits, food) submitted by bar staff. Each item carries a `category` (`beer` | `cocktail` | `spirit` | `food`), structured attributes appropriate to its category, and a `BeerEmbedding`-style vector for similarity matching. Enables food pairing and cross-category upsells without a separate catalog. Deferred for non-beer categories until the staff portal exists. |
| `FoodPairing` | A declared or LLM-derived relationship between a `CatalogItem` (beer) and a `CatalogItem` (food), capturing complementary flavor relationships. v1 scope: beer + food only. Beer → cocktail / wine pairings are deferred. |
| `CatalogEnrichment` | The automated pipeline that fills structured attributes (ABV, IBU, style, flavor profile) when bar staff submit a new menu item by name. Waterfall: (1) fuzzy match against existing catalog; (2) LLM lookup using training knowledge; (3) BJCP style-level priors as fallback; (4) staff confirmation. No scraping of ToS-protected sources. See ADR 0008. |
| `WhiteLabelTenant` | A bar or venue running Beerolog under their own brand, on a paid subscription. Scoped to a `Market`. Has its own staff portal, menu, and branding config. Shares the global catalog and recommendation engine. Users start with a cold-start re-quiz at each venue — no cross-tenant profile portability in v1 (see OD-001). Bar operators see aggregate anonymised taste distribution and recommendation outcomes for their venue; individual user profiles are never exposed to operators (see OD-002). |

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
