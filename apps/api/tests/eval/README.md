# Validation harness (slice #79)

Gates the matcher. Three artifacts:

- `run_personas.py` — runs hand-authored personas end-to-end through
  the actual composers + Match engine. Reports `P@5` + MRR per persona
  and aggregate. Floor: aggregate `P@5 ≥ 0.4`. Below floor, exit code 1.
- `probe_hebrew.py` — measures top-5 hit rate of Hebrew queries against
  an English-keyed catalog. Gate: ≥ 70% of English baseline. Live probe
  against the production embedding service.
- `probe_hops.py` — measures whether hop NAMES carry semantic signal
  vs. a random-pair baseline. Gate: gap ≥ 0.15.

## What ships now

- Runnable harness CLI with `--alpha`, `--beta`, `--floor`, `--compare-beta`
  flags (the last enables the side-by-side `β=0` Higgins null comparison
  the PRD calls for).
- Hebrew + hop probes wired against the live embedding service.
- `personas.json` schema + **one example persona** (`hop-head-ipa-enthusiast`)
  with onboarding answers + a hand-written `expected_top_5` drawn from
  the slice/74 placeholder catalog.

## What's HITL

- **Five remaining personas** — mainstream comfort drinker, dark malt
  fan, sour-and-funky craft nerd, sessionable wheat/lager drinker,
  adventurous omnivore. The maintainer with beer-domain knowledge
  picks the `expected_top_5` for each from the seeded catalog.
- **Twenty Hebrew probe pairs** — one English/Hebrew description pair
  per representative beer. Hebrew speaker review the translation.
- **CI integration** — wire `run_personas.py` to fail PR merges when
  aggregate P@5 < 0.4. Hebrew + hop probes run nightly (against a
  real `OPENAI_API_KEY`) and post results as a comment instead of
  blocking.

## Run locally

    python -m apps.api.tests.eval.run_personas
    python -m apps.api.tests.eval.run_personas --compare-beta
    OPENAI_API_KEY=... python -m apps.api.tests.eval.probe_hebrew
    OPENAI_API_KEY=... python -m apps.api.tests.eval.probe_hops
