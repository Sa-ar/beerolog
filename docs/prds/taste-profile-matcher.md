# Taste Profile Matcher

- Type: Feature
- Current intended status: ready-for-human
- Related ADRs: ADR-0001 (launch-first product boundary), ADR-0002 (Clerk social-first auth), ADR-0003 (two-layer taste architecture)
- Supersedes (partially): `docs/prds/quiz-polish.md`, `docs/prds/results-polish.md`, `docs/prds/catalog-readiness.md` — the parts of these PRDs that assumed a 7-dimension `FlavorVector` and a menu-scoped recommendation flow.

## Problem Statement

A Beerolog user wants to be told what beer to drink. Today, the product cannot answer that question, because:

- The current taste model is a 7-dimension dial vector with no embedding behind it — so two users with identical dials get identical recommendations even when one loves smoky rauchbiers and the other loves fruity NEIPAs.
- There is no real beer catalog. The seed file at `packages/db/src/seeds/beers-data.ts` is a stub, and there are no rows for the Israeli beer market — neither the mainstream world (Goldstar, Maccabee, Tuborg-IL) nor the craft world (Alexander, Malka, Herzl, BeerBazaar, Negev, Schnitt) nor common imports.
- The recommendation surface is bound to a menu-scan flow (per ADR-0001), which means the recommender cannot run without a venue context. The user wants an answer at home, on the couch, before they leave the house — not only at a bar.
- The onboarding quiz assumes beer literacy. A user who has never had a craft beer cannot answer "how malty do you like it" — so the cold-start profile is noise.
- Even if the matcher were good, there is no way to *know* it is good. There is no evaluation harness, no ground-truth personas, no measurable floor.

The user-visible symptom is: *"I opened the app, it asked me beer questions I couldn't answer, and the beers it suggested are not available in Israel and don't feel like me."*

## Solution

Replace the single-vector taste model with a **two-layer matcher** (per ADR-0003) that profiles the user through familiar non-beer sensory experiences, captures tonight's mood at session start, and ranks beers from an Israeli-focused catalog using multilingual vector similarity plus a novelty re-rank.

From the user's perspective:

1. **Sign in** with Clerk (unchanged from ADR-0002).
2. **Take a ~30-second onboarding quiz** of seven one-tap questions, none of which mention beer. The questions ask about coffee, water carbonation, novelty-seeking, snacks, sour foods, citrus juice, and smoked foods — framed in Israeli sensory references (botz / hafuch, *im gaz* / *bli gaz*, halva, amba). The answers seed a `BaselineTaste` profile.
3. **Start a drinking session.** Two quick-picks (`vibe`: refreshing / cozy / adventurous / familiar; `ABV intent`: low / medium / high / don't care) plus an optional free-text "tell me more" box (Hebrew or English). Total ~10 seconds.
4. **See five beer recommendations**, each with name, brewery, style, ABV, market tier (mainstream / craft / import), an image, and a one-line *why-this-beer* explanation derived from which contributor dominated the match score ("matches your usual style + tonight's refreshing vibe" / "a bolder pick than usual — you said you wanted to explore" / "a safe familiar choice").
5. **Rate beers** (1–5 stars) after drinking them. Ratings are stored from day one — used immediately for evaluation and persisted for a later learning loop. The `BaselineTaste` embedding does **not** auto-update from ratings in v1; that wiring is a deferred validation pass.
6. **The team validates the matcher** via a persona-based evaluation harness: six hand-crafted personas with hand-written expected top-5 lists, scored by `precision@5` and mean reciprocal rank, with a floor of `P@5 ≥ 0.6` averaged across personas. The harness is the gate on every change to `α`, `β`, the embedding model, or the seed-text composition template.

## User Stories

1. As a signed-in beer-curious user with no beer vocabulary, I want to complete onboarding by answering questions about coffee and snacks, so that I can start using the app without needing to know beer styles.
2. As a signed-in Israeli user, I want the onboarding to reference botz, hafuch, halva, amba, and SodaStream water, so that the questions feel native to my sensory world rather than translated.
3. As a signed-in Hebrew-speaking user, I want to be able to answer the optional free-text box in Hebrew, so that I can describe tonight's mood in my own words and still get useful matches.
4. As a signed-in user starting a drinking session, I want to make two quick-picks (vibe + ABV intent) and optionally type a sentence, so that the recommender knows what I want *tonight* without forcing a long form.
5. As a signed-in user, I want my session intent to be discarded at session end, so that one weird mood doesn't permanently distort my profile.
6. As a signed-in user, I want my `BaselineTaste` to persist across sessions, so that I don't have to redo the onboarding quiz every time I open the app.
7. As a signed-in user, I want to edit my onboarding answers later, so that I can correct a wrong tap or update my preferences as they evolve.
8. As a signed-in user, I want to see five beer recommendations on the results screen, so that I have meaningful choice without being overwhelmed.
9. As a signed-in user, I want each recommendation to show name, brewery, style, ABV, market tier, and an image, so that I can decide whether a beer is something I'd actually drink.
10. As a signed-in user, I want a one-line explanation of *why this beer*, so that I can trust the system rather than treat it as a black box.
11. As a signed-in user, I want recommendations to favour Israeli craft and mainstream beers, so that the suggestions are things I can actually find.
12. As a signed-in user who likes Goldstar and never wants a sour beer, I want my mainstream-comfort preference reflected in matches, so that the app doesn't push only craft beers at me.
13. As a signed-in craft-curious user, I want the system to occasionally surface a more adventurous beer when I've signalled novelty-seeking, so that I discover beers I wouldn't have picked myself.
14. As a signed-in user who said "adventurous" in tonight's vibe but is generally a comfort drinker, I want the system to respect the session signal without abandoning my baseline entirely, so that recommendations stretch me without being alien.
15. As a signed-in user, I want to rate a beer 1–5 stars after drinking it, so that I can record my experience.
16. As a signed-in user, I want my ratings to be stored even if they don't immediately change my profile, so that the team can use them to evaluate and later improve the matcher.
17. As a signed-in user, I want the catalog to include Schnitt's brewpub-exclusive beers, so that when I'm planning a Schnitt visit the app helps me pick.
18. As a signed-in user, I want the catalog to include common imports (Belgian, German, English styles widely stocked in Israel), so that imports aren't invisible to the matcher.
19. As a signed-in user, I want recommendations even when I skip the session intent (no quick-picks, no free text), so that I can get a baseline-only recommendation when I haven't formed a mood.
20. As the developer validating the matcher, I want a persona-based evaluation harness with `P@5` and MRR, so that I can tell whether an algorithm change improved or regressed match quality.
21. As the developer, I want the harness to run on every meaningful change (`α`, `β`, embedding model, seed-text template), so that regressions are caught before they ship.
22. As the developer, I want to tune `α` (baseline vs session weight) and `β` (novelty re-rank weight) without re-deploying, so that I can iterate on the matcher.
23. As the developer, I want the catalog seed to be re-runnable from scratch, so that adding a brewery or fixing a scrape bug doesn't require manual data surgery.
24. As the developer, I want missing tasting notes to be filled by an LLM and tagged `notesSource: synthetic`, so that no beer is excluded from the matcher purely because the brewery website is sparse — and so synthetic notes can be replaced later.
25. As the developer, I want hop and malt names to feed the `BeerEmbedding` directly, so that the embedding model captures the strong semantic signal those names carry.
26. As the developer, I want every recommendation call to return a score breakdown (baseline component, session component, novelty component), so that I can debug why a beer was suggested.
27. As the developer, I want `BaselineTaste` embeddings persisted per user (not recomputed per recommendation) and refreshed on dial change, on new rating, or after 7 days, so that latency stays low and embedding-API costs stay bounded.
28. As the developer, I want the `BeerEmbedding` source string composed deterministically from a fixed template, so that a re-embed of the catalog is reproducible byte-for-byte.
29. As the developer, I want to drop the old `userStyleSuppressions` table and the `flavorVector` column in the same migration that adds the new schema, so that there are no orphaned columns implying behaviour that no longer exists.
30. As the developer, I want `Adventurousness` computed at seed time from `marketTier` + style rarity + ABV, so that the novelty re-rank has a stable per-beer score to work with.

## Implementation Decisions

### Domain model (locked in `CONTEXT.md` and ADR-0003)

- `BaselineTaste`: persisted per user. Composed of explicit dials (bubbles, bitterness, multi-axis flavor family), a `NoveltyAffinity` modifier, and a derived multilingual embedding. Embedding refreshed on dial change, on new rating, or after 7 days idle.
- `SessionIntent`: ephemeral per session. Composed of `vibe`, `ABV intent`, and optional free text. Embedded with the same multilingual model. Discarded at session end.
- `NoveltyAffinity`: permanent user-model field, not a taste dial. Modulates the novelty re-rank.
- `Match`: two-stage. Stage 1 retrieves candidates by `α · cos(baseline, beer) + (1−α) · cos(session, beer)` with `α = 0.6` default. Stage 2 re-ranks by `β · (NoveltyAffinity − 0.5) · beer.adventurousness` with `β = 0.3` default. Both knobs are runtime-configurable. **Caveat:** the `adventurousness` composite (`marketTier` + style rarity + ABV) is ad-hoc; standard RecSys novelty is `-log(popularity)` (Vargas & Castells, RecSys 2011) but Beerolog has no popularity signal at launch. Pure heuristic until ratings accumulate, at which point we plan an A/B vs popularity-based novelty.
- `Beer`: one row per recipe. No format, no batch, no serveStyle (intentional). Carries `marketTier` (`mainstream` / `craft` / `import`), `adventurousness`, full beer-data fields (IBU, hops, malts, yeast, color, body, sweetness), `tastingNotes` (+ language + source), `embedding`, `imageUrl`, `sourceUrl`, `seededAt`.
- `BeerEmbedding`: composed deterministically from all available beer fields via a fixed template; embedded with `text-embedding-3-large` (1536-D, multilingual).
- `Rating`: 1–5 integer, stored day one, **not** wired into baseline-embedding updates in v1.
- `Recommendation`: ranked top-5 beer suggestion. No longer menu-scoped. Each recommendation carries a one-line why-this-beer explanation derived deterministically from the dominant score contributor.

### Modules

Deep modules, all with pure or near-pure interfaces. The matcher is the load-bearing one and is unit-testable end-to-end without a running DB by injecting embeddings.

1. **Embedding service** — single function `embed(text) → vector(1536)`. Wraps OpenAI `text-embedding-3-large`. Stateless. One thin integration test against the real vendor; everything else mocks it.

2. **Catalog seed pipeline** — orchestrates: per-brewery scrapers → `normaliseRow` (pure) → `synthesiseNotes` (LLM fallback when notes missing, tags `notesSource: synthetic`) → `computeAdventurousness` (pure, 0–1 from `marketTier` + style rarity + ABV) → `composeBeerText` (pure, deterministic template) → `embed` → write Beer + embedding rows. Re-runnable from scratch.

3. **`BaselineTaste` composer** — pure: `(quizAnswers, noveltyAffinity) → synthetic preference text → embedding`. Encapsulates the question-to-text mapping table; question text changes are localised here.

4. **`SessionIntent` composer** — pure: `(vibe, abvIntent, freeText) → synthetic intent text → embedding`. Same shape as #3.

5. **`Match` engine** — the core. Inputs: baseline embedding, NoveltyAffinity, session embedding (nullable), `α`, `β`. Outputs: top-K beers each with `{baselineScore, sessionScore, noveltyScore, totalScore, dominantComponent}`. Pure given DB access. When `SessionIntent` is null (user skipped quick-pick), the session weight is rebalanced into the baseline.

6. **Why-line explanation** — pure: `MatchResult → string`. `switch` on `dominantComponent`. Templates keep one-line discipline.

7. **Persona evaluation harness** — lives at `apps/api/tests/eval/`. Reads `personas.json` (six personas with onboarding answers + expected top-5 beers). Runs each persona through the full pipeline (compose → embed → match), reports `P@5` and MRR per persona + aggregate. Fails if aggregate `P@5 < 0.6`. Runnable locally and from CI.

8. **Schema migration** — new tables / columns:
   - `beers` (new): `id`, `name`, `nameHebrew`, `brewery`, `breweryCountry`, `style` (~25-value enum), `abv`, `ibu`, `hops` (text[]), `malts` (text[]), `yeast`, `color` (enum), `body` (enum nullable), `sweetness` (enum nullable), `marketTier` (enum), `tastingNotes`, `tastingNotesLang` (enum), `notesSource` (enum), `adventurousness` (real), `embedding` (`vector(1536)`), `imageUrl`, `sourceUrl`, `seededAt`. pgvector index on `embedding` (cosine).
   - `user_baseline_taste` (new): `userId`, dials, `noveltyAffinity`, `embedding` (`vector(1536)`), `embeddingFreshAt`, `updatedAt`.
   - `beer_ratings` (rework): change `rating` from enum to integer 1–5. Keep history of prior ratings if any exist (none in production yet).
   - Drop `user_profiles.flavorVector` column and the `userStyleSuppressions` table. Drop the old `beer_style` enum after migrating any references.
   - pgvector extension enabled in migration.

9. **API endpoints** — thin orchestrators over modules 3+4+5+6:
   - `POST /onboarding` — accepts quiz answers, computes BaselineTaste, persists.
   - `POST /recommendations` — body carries session intent (or null); returns top-5 with why-lines and score breakdown.
   - `POST /ratings` — stores rating, no profile mutation.
   - `GET /me/baseline-taste` and `PATCH` for the edit-my-dials story.

10. **Web UI** — onboarding flow (7 one-tap questions, Hebrew/English copy), session-intent quick-pick (2 picks + free text), recommendations result page (5 cards with why-lines), rating capture. Existing TanStack Start app; new routes under `apps/web/src/routes/`.

### Configuration knobs

- `MATCH_ALPHA` (default `0.6`) — baseline-vs-session weight. Static linear fusion is the canonical hybrid-retrieval baseline (Adomavicius & Tuzhilin 2011; classic CARS literature) but **not state of the art**. Recent work (Dynamic Alpha Tuning 2024; gated session models — GRU4Rec, NARM, SR-GNN) shows learned weighting beats static `α`. We ship static `α` in v1, log per-query baseline/session scores, and plan a v2 follow-up to evaluate Reciprocal Rank Fusion (Cormack et al. 2009) and a learned gate against the persona harness.
- `MATCH_BETA` (default `0.3`) — novelty re-rank weight. See "Sensation-seeking is research-motivated" — this is a hypothesis-weight, not a calibrated coefficient.
- `BASELINE_STALENESS_DAYS` (default `7`) — forces embedding refresh.
- `EMBEDDING_MODEL` (default `text-embedding-3-large`). **Hebrew quality is unverified by the vendor** (OpenAI publishes no Hebrew MIRACL number). Candidate fallbacks: `multilingual-e5-large-instruct`, `BAAI/bge-m3` — both shown to outperform proprietary models on low-resource languages in MMTEB (arXiv:2502.13595). Swap requires a full catalog re-embed. The Hebrew retrieval probe (see Testing Decisions) gates the launch model.
- All four are env-var-driven; no code change to tune.

### Cold start: session intent skipped

If the user requests recommendations without supplying a `SessionIntent`, the matcher runs baseline-only: `score = cos(baseline, beer)`, then the novelty re-rank applies as normal. The why-line collapses to *"matches your usual style."*

## Testing Decisions

Good tests in this codebase pin external behaviour, not implementation. The pattern in `apps/api/tests/test_contract_authority.py` and `test_dependencies.py` is the prior art: tests describe what callers can rely on, not how it's wired internally.

### Unit tests (deep modules)

- **Module 3 (`BaselineTaste` composer):** given a fixed quiz-answer payload, assert the synthetic text and (if mocked) the embedding call shape. Property test: changing a single dial changes the text in exactly the expected substring. Snapshot the composed text per persona.
- **Module 4 (`SessionIntent` composer):** same shape as Module 3. Snapshot for each combination of `vibe × abvIntent` with and without free text.
- **Module 5 (`Match` engine):** the heart. Inject canned embeddings for a tiny in-memory catalog; assert the ranking order changes correctly as `α`, `β`, `NoveltyAffinity`, and `adventurousness` vary. Specifically:
  - high `NoveltyAffinity` + high-`adventurousness` beer ranks higher than identical-cosine low-`adventurousness` beer
  - session embedding similar to a beer overrides a less-similar baseline match when `α` is low
  - null `SessionIntent` reverts to baseline-only ranking
- **Module 6 (Why-line):** table-driven test over each `dominantComponent` value.
- **Module 7 (Persona harness):** the harness *is* the integration test. The unit test asserts P@5 and MRR are computed correctly given a canned matcher output.
- **Module 2 substeps (`normaliseRow`, `composeBeerText`, `computeAdventurousness`):** table-driven over example scraped records. Scraper layer mocked.

### Integration tests

- **Module 1 (Embedding service):** one real-vendor call against a stable input, asserting vector dimensionality and a sanity-check cosine between two known-related inputs. Skipped in offline CI; runs nightly.
- **`POST /recommendations`:** end-to-end through the actual DB with a seeded mini-catalog (~10 beers) and a stub user. Asserts the response shape, the presence of why-lines, and that score-breakdown numbers sum correctly.

### Embedding-quality probes (load-bearing pre-launch checks)

Two offline probes that gate "is the embedding model actually doing what the PRD assumes." These are not pass/fail tests — they are evidence checks whose results determine whether we proceed with the default model or switch to a fallback.

- **Hebrew retrieval probe.** Take 20 catalog descriptions, translate to Hebrew, query the catalog in Hebrew, measure top-5 hit rate against the English-keyed truth. **OpenAI publishes no Hebrew benchmark for `text-embedding-3-large`** (it is not in MIRACL); MMTEB (Enevoldsen et al. 2025, arXiv:2502.13595) shows `multilingual-e5-large-instruct` and `BAAI/bge-m3` outperform proprietary models on low-resource languages. If `text-embedding-3-large` hit rate is below ≈70% of the English-query baseline, switch to `multilingual-e5-large-instruct` as the EMBEDDING_MODEL before launch.
- **Hop semantics probe.** 20–30 hop-descriptor pairs (`"Citra"` vs `"tropical citrus grapefruit passionfruit"`, `"Saaz"` vs `"noble herbal earthy"`, `"Mosaic"` vs `"stone fruit mango blueberry"`, etc.). Measure cosine. If pairs do not cluster meaningfully above random-pair baseline, the assumption "hop names carry signal" is broken and either (a) the `composeBeerText` template must spell out the descriptor instead of relying on the hop name, or (b) we need a hop-name → descriptor expansion table at compose time. **This is a real risk** — it is plausible the embedding model knows hop semantics from web text, but unverified.

### Evaluation (persona harness)

- **Six personas** authored in `apps/api/tests/eval/personas.json` once the seed catalog exists. Each persona has onboarding answers + a hand-written **expected top-5 set** from the seeded catalog.
- **Relevance definition** (must be explicit to make `P@5` meaningful): a returned beer counts as relevant if it appears in the persona's hand-written top-5 set **OR** shares a style-family with one of them (e.g. the persona's top-5 includes an American IPA → any IPA in the catalog counts as relevant). Style-family relevance reflects the reality that the matcher's job is taste-fit, not exact-pick recall.
- **Metrics:** `precision@5` and mean reciprocal rank per persona, plus aggregate.
- **Floor:** aggregate `P@5 ≥ 0.4`. Published cold-start recommendation benchmarks rarely exceed 0.20–0.35 even with LLM-augmented gains (Wu et al. 2024, arXiv:2305.19860; instructional prompt optimisation arXiv:2509.09066); 0.4 with the style-family relevance definition is a defensible "working" bar. **A higher floor on a small in-house persona set is meaningless without that relaxed relevance definition.**
- **Trigger:** runs in CI on every PR that touches the matcher, the composers, the embedding source template, or the seed pipeline.

### Out of test scope

- The scrapers themselves — one-off scripts, mocked at the `normaliseRow` boundary.
- The vendor embedding model's internal quality — we test that we call it, not what it returns.
- The web UI flows — covered by the existing TanStack/Vitest pattern (a separate PRD if it needs to grow).

## Out of Scope

- **Venue / menu-scan / availability.** A `Recommendation` is abstract. Knowing what is on tap at a given bar is a future PRD; the data model leaves room for an `availableAt` field on `Beer` but does not introduce it now.
- **Rating → BaselineTaste embedding update loop.** Ratings are stored; they do not yet mutate the user's embedding. A separate PRD will validate the learning loop after the cold-start matcher is proven.
- **Untappd integration.** No API calls, no caching of Untappd-owned data. Catalog is sourced directly from breweries, aggregators, and the Schnitt brewpub menu.
- **Social features:** badges, friend challenges, group sessions, leaderboards, taste comparison. All remain deferred per ADR-0001.
- **Multi-tenant venue tooling, operator workflows, managed tap-list.** Deferred per ADR-0001.
- **Format-aware recommendations** (bottle vs draft vs can). The pivot intentionally drops this; freshness/storage noise was judged a worse signal than no signal. Could come back as a per-rating attribute later.
- **Hard SQL filters on session intent.** ABV intent is a soft prior in the synthetic session text, not a `WHERE` clause. If users systematically get out-of-range ABV recommendations, a follow-up PRD can add a configurable hard cap.
- **Real-user A/B testing of hypothesis questions** (Q4–Q7 in the onboarding). Captured in ratings data for offline analysis; no live experiment framework in v1.
- **Local self-hosted embedding model.** `multilingual-e5-large` is a known fallback but not pursued in v1; OpenAI's `text-embedding-3-large` is the lock-in, with vendor risk explicitly accepted.

## Further Notes

### Why the persona harness is load-bearing

The entire pivot's value is conditioned on "the matcher actually works." Without a measurable floor and a deterministic evaluation, every tuning decision (`α`, `β`, embedding model, seed-text template) is vibes-driven. The personas are the artifact that turns "validate the matcher" from a slogan into a CI check. They are also the first artifact someone unfamiliar with the system should read — they encode the design intent in concrete examples that no glossary can.

### Israeli-context references in onboarding

The onboarding copy explicitly uses Israeli sensory references where they carry signal: coffee styles (botz, espresso, hafuch, iced sweet), water gas (*im gaz* / *bli gaz*), snack categories (halva, dark chocolate, fresh fruit, milk chocolate), fermented food (amba, pickles, sauerkraut). This is not localisation polish — it's part of why the quiz produces a meaningful signal in the target market. A user from a different market would still be served by these references (everyone drinks coffee, everyone has a water-gas preference), but the Israeli framing reduces friction for the primary audience.

### Sensation-seeking is research-motivated, not research-established

The `NoveltyAffinity` modifier is motivated by Higgins & Hayes (2020, Penn State, *Food Quality and Preference*, n≈109), which found that bitterness perception inverts as a predictor of hop-forward beer preference in the absence of sensation-seeking signal. **This finding has not been independently replicated** in subsequent literature (2021–2025 search) and rests on a single lab. We ship the modifier anyway because (a) the mechanism is plausible and (b) the post-retrieval re-rank form is cheap to disable or invert if production rating data contradicts the prior. Treat β as a tunable hypothesis-weight, not a calibrated coefficient. The persona harness reports `β = 0` and `β = 0.3` runs side-by-side until we have enough real ratings to test the interaction empirically.

### Sour-liker mapping is hypothesis, not evidence

The Penn State / Italian 2024 sour-liker work (Moulinier, Hopfer, Hayes et al., *Food Quality and Preference*) established a ~12.5% sour-liker phenotype using citric-acid solutions and sour candy. **No published study links this phenotype specifically to sour-beer preference.** The amba/pickle/sauerkraut question is a working hypothesis we instrument and validate against rating outcomes, not a load-bearing claim.

### Schnitt is `craft`, not its own tier

Schnitt is a Tel Aviv brewpub whose beers are brewpub-exclusive. The pivot tags them `marketTier: craft` and leaves brewpub-exclusivity as a (deferred) availability concern. When venues come back, Schnitt's beers will have a single-element `availableAt`. This is intentional: the matcher cares about taste, not about how hard the beer is to find.

### Migration is destructive

The schema migration drops `user_profiles.flavorVector`, drops `userStyleSuppressions`, and reworks `beer_ratings.rating` from enum to integer. Because the product has no production users yet (per `CONTEXT.md` and the recent Clerk migration commits), this is acceptable. If users do exist by the time the migration ships, the migration plan needs an explicit data-loss note added to its slice issue.

### Vertical slice candidates (for `/to-issues`)

The natural slicing for this PRD:

1. **Schema migration** — new tables, pgvector extension, drop old columns. No behaviour yet.
2. **Embedding service + catalog seed pipeline** — scrape, normalise, synthesise notes, compute adventurousness, embed, write. Produces a real catalog of ~150 beers.
3. **`BaselineTaste` composer + onboarding API** — take quiz, persist baseline.
4. **`SessionIntent` composer + `Match` engine + recommendations API** — the matcher proper.
5. **Why-line explanation + recommendations response shape** — user-facing wiring.
6. **Persona evaluation harness** — personas authored, metrics computed, CI gate wired.
7. **Onboarding UI** — 7-question flow.
8. **Session-intent + results UI** — quick-pick + 5-card results page.
9. **Rating capture (store-only)** — 1–5 stars, persisted, not yet wired to learning loop.

Slices 1–6 are the matcher-validation scope; 7–9 make it usable in the app. All nine together are the pivot's MVP.
