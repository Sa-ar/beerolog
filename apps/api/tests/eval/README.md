# Evaluation harness

Three scripts. One runs offline and gates CI; two hit the real embedding service and
answer questions the offline one structurally cannot.

## `run_personas.py` — the CI gate

Six personas, each a full `OnboardingAnswers` payload plus a session intent, run end to
end through the real composers and the real ranker. Reports precision@5 and mean
reciprocal rank per persona and in aggregate.

Relevance: a returned beer counts if its id is in `expected_top_5`, or if its style
shares a family with one of the expected beers (an IPA standing in for another IPA is a
hit; a stout is not).

```bash
python tests/eval/run_personas.py                 # offline, deterministic
python tests/eval/run_personas.py --compare-beta  # A/B the novelty re-rank against beta=0
python tests/eval/run_personas.py --floor 0.5     # regression gate; exits 1 below the floor
python tests/eval/run_personas.py --live          # real embeddings, needs OPENAI_API_KEY
```

The floor is a regression gate, not a quality target. Set it just under the current
aggregate so an unrelated change that degrades ranking fails the build.

## `offline_embedding.py` — why there is no model here

The harness needs a vector for whatever text the composers produce. Calling the real
embedding model for that would make the gate cost money, require a key in CI, and
drift every time the model is revised — so offline mode projects the composed text
into the same eight axes the placeholder catalog is written in
(`bubbles, bitterness, malty, roasty, fruity, sour, smoky, novelty`).

It is a bag-of-phrases lookup keyed on the exact sentences the composers emit. That is
deliberate: a phrasing change in the composer becomes a missing key, and
`test_offline_embedding.py` walks the whole enum space of the quiz and fails on it.
The alternative — a fuzzy or hash-based stub — degrades silently, which is worse than
no harness at all, because it keeps printing a number.

## `probe_hebrew.py` — cross-lingual retrieval (live)

The product is bilingual; the catalog is keyed in English. Embeds ten Hebrew beer
descriptions and ranks each against the ten English ones, reporting top-1, top-5 and
MRR. Gate: top-5 ≥ 70%.

Below the gate, the remediation is to store Hebrew catalog text rather than to rely on
the embedding model to bridge two scripts.

## `probe_hops.py` — do hop names carry meaning? (live)

Twenty (hop name, descriptor) pairs. Compares the mean cosine of true pairs against a
random-pair baseline. If the gap is small, "Citra" is close to meaningless to the model
and the catalog pipeline has to expand hop names into explicit flavour descriptors
before embedding.

## Adding a persona

Add an entry to `personas.json` with an `onboarding` payload valid against
`OnboardingAnswers`, an optional `session`, and the ids you expect back. Run the
harness; if the score moves a lot, the persona is telling you something about the
ranker, not about itself.

## The DB-backed probes

`probe_cosine_calibration.py` and `session_overlap.py` need a seeded database and
a live embedding client, so they are run by hand against a real environment
rather than in CI. They calibrate the raw-cosine → user-facing match percentage
and measure how much two different session intents actually reorder the results.
