# Roasted/Coffee Dislike — Signal & Penalty Research

Background: users who signalled they don't do coffee still got coffee-forward beers.
This doc records the evidence that settles (a) how to capture a graded roasted/coffee
**flavor** preference and (b) how to turn a stated dislike into a ranking penalty.
Deep-research harness; final synthesis was cut by a session limit, so this is a manual
synthesis of the 15+ verified claims (each cited below).

## Settled decisions

1. **Capture dislike as its own explicit, graded signal — do NOT infer it from a low/absent
   "like".** Absence of positive feedback signals *neutrality, not dislike*; reversing a
   positive model does not yield a negative one. So `coffee=none` (or a low roasty dial)
   must not be read as aversion — add an explicit graded question.
   *(arxiv 2601.15721; Cena et al. 2023)*
2. **Use a short, fully-labeled, symmetric bipolar scale with a true neutral and a strong-
   aversion anchor.** The 9-point hedonic scale is the canonical bipolar form (4 like / neutral /
   4 dislike, every point labeled); people avoid the extremes (effectively 7 points), and a
   3–point hedonic scale discriminates as well as 9 when items differ a lot. → a **5-point**
   fully-labeled scale is the onboarding sweet spot, with an explicit "really dislike" end
   (LAM-style strong anchor). *(Peryam & Pilgrim 1957; Moskowitz; LAM; Frontiers 2023 3PHS)*
3. **A disliked flavor is not just "low liking" — it's distaste**, a distinct sensory-rejection
   mechanism, validly captured by ONE direct sensory-worded item; strong black coffee is a
   textbook distaste example. Word the question about **flavor character** (roasted/coffee/
   dark-chocolate), not "do you drink coffee" and not bitterness (already asked directly).
   *(Rozin 1980; ScienceDirect S0195666325001862 — "I would dislike the taste, smell, or
   texture of this food"; Qualtrics on double-barreled items)*
4. **Model the dislike as an additive, graded PENALTY — soft down-rank, not hard filter.**
   Mainstream recommenders neglect dislikes (treat disliked ≈ unknown) — exactly our bug.
   The fix: a distinct additive term that pushes disliked-attribute items down, proportional
   to graded dislike intensity (DISLIKES₁..ₘ), governed by a single tunable weight that is
   **capped/throttled to avoid over-filtering** (empty results). Explicit negative modeling
   improves accuracy AND cuts disliked items at the top. *(PMC9038518; arxiv 1812.11422 —
   tunable alpha caps push distance; arxiv 2601.15721 — gamma-weighted additive penalty;
   RG 395337226 case study — serving-time down-rank + throttle)*

## Deliverable A — recommended question (5-point bipolar, fully labeled)

Prompt: **"Roasted, coffee & dark-chocolate flavors — how do you feel?"**
(HE: “טעמים קלויים, קפה ושוקולד מריר — מה דעתכם?”)

| value | EN label | roasty dial |
|-------|----------|-------------|
| `love`    | Love them            | 0.90 |
| `like`    | Like them            | 0.70 |
| `neutral` | No strong feelings   | 0.40 |
| `dislike` | Not really for me    | 0.20 |
| `hate`    | Really dislike them   | 0.05 |

Neutral sits at 0.40 (above the old 0.30 "no data" default) so absence-of-answer and an
explicit neutral stay distinguishable, and `dislike`/`hate` land clearly below any neutral
threshold. Owns the `roasty` dial end-to-end; the coffee-order question stops driving roasty.

## Deliverable B — penalty shape

Per-family, in `match_engine.rank()` (mirrors the existing `abv_term` negative precedent):

```
avoid_penalty = avoid_weight * Σ_family max(0, NEUTRAL - user[family]) * beer_family_strength
total = baseline + session + abv + novelty - avoid_penalty
```

- **Linear in dislike intensity** (`NEUTRAL - user[family]`), so a faint dislike nudges and
  "really dislike" (0.05) down-ranks hard — graded, per the strata evidence.
- `NEUTRAL ≈ 0.35` (just below the explicit-neutral 0.40, so only real dislikes penalize).
- `avoid_weight` tunable in config, **capped** so a full-strength dislike of a coffee-forward
  beer (roasty≈0.85) subtracts on the order of `0.4 * 0.30 * 0.85 ≈ 0.10` — comfortably above
  the ~0.2–0.5 cosine band's spread to reorder top-N, without zeroing everything (soft, not a
  ban). Start `match_avoid_weight = 0.4`; tune against the placeholder catalog.
- Soft down-rank, never a hard exclusion — safe on a thin catalog.

## Sources (verified)
- Peryam & Pilgrim 1957 / hedonic-scale review: https://docs.ufpr.br/~aanjos/SENSOMETRIA/artigos/01_revisao_hedonica.pdf
- 3-point vs 9-point hedonic: https://www.frontiersin.org/journals/food-science-and-technology/articles/10.3389/frfst.2023.1071216/full
- Rozin food-rejection taxonomy (distaste): http://web.sas.upenn.edu/rozin/files/2016/09/53Categorizationfofoods1980-z8mfvp.pdf
- Distaste vs disgust indicators: https://www.sciencedirect.com/science/article/pii/S0195666325001862
- Negative preferences framework: https://pmc.ncbi.nlm.nih.gov/articles/PMC9038518/
- Modeling negative feedback (tunable capped push): https://arxiv.org/pdf/1812.11422
- Additive gamma-weighted dislike penalty: https://arxiv.org/pdf/2601.15721
- Explicit-negative-feedback case study (serving-time down-rank + throttle): https://www.researchgate.net/publication/395337226
- Double-barreled items: https://www.qualtrics.com/articles/strategy-research/double-barreled-question/

_Note: the deep-research run hit a session limit at the synthesis/verify tail; the claims
above are the ones that passed 3-vote verification before the cutoff. Re-run to complete the
remaining verifications if stronger confidence is needed._
