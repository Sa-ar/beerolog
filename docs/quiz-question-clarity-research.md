# Taste-Quiz Question Clarity — Research & Rewrites

Feedback said the taste-profile quiz "isn't clear about what we're asking." This doc
is the evidence-backed answer: what the research says about question wording, a
clarity-principles checklist, and a **before/after rewrite table for every question
and option**. It is a recommendation — no code is changed by this doc.

Scope note: `docs/quiz-ux-research.md` already settled the **mechanics** (one-question-
per-screen, progress bar, visual icons, no keyboard auto-advance, <12 questions). This
doc is complementary and narrower: **wording, framing, and the proxy strategy itself.**
Wording lives in `apps/web/src/i18n/locales/{en,he}/common.json` (`onboarding.questions.*`
and `enums.<group>.*`); option **value codes** live in `apps/web/src/lib/onboarding-quiz.ts`
and drive dial composition — labels are display-only, value codes are load-bearing.

## TL;DR

1. **Our marquee proxy is scientifically weak.** "Your coffee order?" → beer bitterness
   is a *noisy, directionally-unreliable* index. Bitter-taste preference is compound- and
   beverage-specific, not one "bitterness tolerance" trait, and bitter-sensitive people
   often drink *more* coffee, not less. **Demote it and add a direct bitterness anchor.**
   *(high confidence)*
2. **Direct beats clever.** Direct self-report predicts real behavior better than indirect
   proxies; indirect formats are comprehension-fragile (~35% misread the structure in one
   study) and framing-sensitive. Keep proxies *concrete, single-topic, and legible about
   what they measure.* *(high)*
3. **Split every double-barreled option** ("Sweet & creamy", "Light & easy-drinking (low
   alcohol)", "sweet & rich") — one attribute per option. *(high)*
4. **Fully label every scale point** with a concrete phrase — measurably raises reliability,
   most for lower-literacy users. Kill empty midpoints ("Middle of the road", "They're
   okay"); write a substantive middle. *(high / medium)*
5. **Name the subject in the prompt** ("Fizzy or flat?" → "Sparkling water — fizzy or flat?")
   and **de-jargon the branches** ("barnyard" means nothing to a non-geek). *(clarity)*
6. **"Why we ask" subtext and payoff microcopy have no hard evidence** in the verified set —
   ship them as **A/B hypotheses**, not settled fact.

## What the evidence says

### 1. Proxy / indirect elicitation — the coffee question is the real problem

The coffee→bitterness proxy *feels* clever but the sensory-science evidence is against it
(high confidence, multiple converging primary sources):

- Bitter-taste preference is **receptor- and beverage-specific** — distinct TAS2R genes
  mediate coffee vs. grapefruit vs. alcohol bitterness (Hayes 2011). There is no single
  "bitterness tolerance" dial that coffee cleanly reads.
- The proxy can **invert**: genetically-predicted caffeine-bitterness sensitivity predicts
  *more* coffee, not less (Ong 2018, UK Biobank n≈438,870). "Sensitive to bitter →
  avoids bitter drinks" is not how it works.
- Liking bitter foods correlates only **r≈0.17** with liking black coffee; a variant that
  raises dark-chocolate intake *lowers* beer intake (Cornelis 2021). Coffee liking is
  driven as much by **caffeine conditioning** as by bitterness perception — "how do you
  take your coffee" partly measures a caffeine habit, not taste.

Broader elicitation research (high confidence, though from risk/time-preference domains, so
transfer to taste is analogical): **direct self-report predicts behavior better than
indirect methods**; ~35% of respondents couldn't correctly comprehend an indirect
question's structure, and a trivial presentation change flipped conclusions (PMC9305924);
same-domain preference questions out-predict adjacent-domain proxies (ScienceDirect 2025).

**Implication:** proxies are fine for lowering jargon friction, but (a) don't let a weak
proxy (coffee) carry a whole dial alone, (b) keep each proxy concrete and single-topic,
and (c) consider one **direct, plain-language** bitterness anchor ("strong black coffee,
tonic water, grapefruit — love it or wince?") that names bitter things without beer jargon.

### 2. "Why we ask" friction — plausible, unproven

No verified experimental evidence survived on whether a one-line rationale under each
question raises completion/trust or adds load. Practitioner teardowns (Noom, RevenueCat —
blog-grade) show inline rationale ("hormones affect metabolism, so we ask about…") placed
*on the same screen* as the question, plus surfacing the payoff early. Progressive
disclosure — one thing per page (NN/g; GOV.UK "one thing per page") — is the structural
move that makes room for a short rationale without lengthening any screen. **Treat subtext
as a testable hypothesis, added one screen at a time.**

### 3. Double-barreled options — clear fix (high confidence)

An option that bundles two attributes ("Sweet & creamy" = sweetness + dairy; "Light &
easy-drinking (low alcohol)" = body + ABV; "sweet & rich" = sweetness + body) makes it
impossible to know which the user answered and "produces analytic problems and questions
of construct validity" (Qualtrics, corroborated by Pew and the Sage Encyclopedia of Survey
Research Methods). Fix: **split into one attribute per option and pretest.**

### 4. Midpoint / neutral labeling (medium confidence)

A neutral midpoint is **context-dependent, not universally harmful**: "most respondents
use the neutral category validly," and a midpoint "might improve psychometric properties
when appropriately applied"; misuse as an "escape" concentrates on *socially sensitive*
items — which taste questions are not (Nadler 2024, Springer). *Refuted en route:* the
stronger claim that omitting the neutral improves reliability failed verification — don't
rely on it. **Keep the midpoint on taste items, but phrase it as a real position** ("a
little fizz is nice", "now and then") not an empty dodge ("Middle of the road", "They're
okay", "No strong preference").

### 5. Answer-label concreteness & count (high confidence)

- **Fully labeling every point** (not just endpoints) raises reliability — .719 vs .506 on
  a 7-point scale in one study — with the **largest gains for lower-education respondents**
  (Survey Practice / Alwin; Saris & Gallhofer meta-analysis of 1,023 questions).
- **2–4-point scales are less reliable** than ~7-point; item-specific scales improve up to
  ~11 points (PMC5993837, Preston & Colman 2000). For a low-friction onboarding quiz this
  argues for a **fully-labeled ~4–5-point item-specific ramp** where an attribute has real
  gradation, rather than reflexively using 3 options — balanced against friction.
- Order options as a consistent **low→high ramp** (already a shipped mechanic, D5).

### 6. Outcome / payoff microcopy — plausible, unproven

No verified case-study metrics survived. Teardowns advise **surfacing the payoff early**
("here's the kind of match you'll get") rather than burying it past every question. We
already have anticipation copy ("Almost there — one more and we'll pour your matches");
adding an **early/mid-quiz payoff peek** is a reasonable A/B, not an evidenced win.

## Question-clarity principles (checklist)

Each maps to one of the suspected problems from the feedback:

- **P1 — Prefer direct, concrete, single-topic questions.** When a proxy lowers jargon
  friction, keep it concrete and don't let a *scientifically weak* proxy (coffee→bitterness)
  carry a dial alone. → *proxy-relevance gap*
- **P2 — Name the subject in the prompt.** Don't rely on an icon to say what's being asked. → *contextless prompts*
- **P3 — One attribute per option.** Split every bundle. → *double-barreled options*
- **P4 — Fully label every point; write a substantive midpoint.** No empty "okay/middle". → *vague midpoints*
- **P5 — No domain jargon; anchor abstract options to an everyday referent.** → *jargon in branches*
- **P6 — Say what a question is for.** "Which flavors do you love?" beats "Tap everything that's you." → *opaque capstone*
- **P7 — Show the payoff (early + per-question), as an A/B hypothesis.** → *no "what this affects"*
- **P8 — A fully-labeled ~4–5-point ramp beats a reflexive 3-point** where the attribute truly grades. *(evidence, sub-Q5)*

## Before / after rewrite table

`Change` column: **label-only** = edit `enums.*` / `questions.*` strings, value codes
unchanged, safe and cheap (keep `he/common.json` in lockstep). **structural** = touches the
question set / value codes in `onboarding-quiz.ts` and the `/onboarding` dial composition —
needs eng work + updated `onboarding-quiz.test.ts`.

| # | Question (dial) | Current prompt | Proposed prompt | Principle | Change |
|---|---|---|---|---|---|
| 1 | coffee (bitterness) | "Your coffee order?" | "Your coffee order?" + subtitle "This hints at how much bitterness you enjoy." | P1, P2, P7 | label-only (subtitle = new key) |
| 1b | **NEW** bitterness anchor | — | "Strong black coffee, tonic water, grapefruit — love it or wince?" | **P1** (direct anchor for a weak proxy) | **structural** |
| 2 | chocolate (bitterness confirm) | "Dark chocolate — how dark?" | keep (already concrete, fully labeled) | — | none |
| 3 | water (carbonation) | "Fizzy or flat?" | "Sparkling water — fizzy or flat?" | P2 | label-only |
| 4 | sweet_tooth (sweetness [+body]) | "Do you have a sweet tooth?" | "How sweet do you like your drinks?" | P3, P4 | label-only (see note) |
| 5 | strength (body/ABV) | "How strong do you like your drink — light or boozy?" | keep prompt; fix options | P3, P4 | label-only |
| 6 | sour_foods (sour) | "Sour & vinegary things — pickles, kombucha?" | keep (concrete, single-topic) | — | none (fix midpoint) |
| 6b | sour_wild (bright vs funky) | "Funky, wild, barnyard flavors too?" | "When something's sour, how do you like it?" | P5 | label-only |
| 7 | smoked_foods (smoke/roast) | "Smoky foods — BBQ, smoked fish?" | keep | — | none (fix midpoint) |
| 8 | adventure (novelty) | "How adventurous are you with new flavors?" | keep | — | none |
| 9 | avoids (CATA) | "What usually puts you off?" | keep + subtitle "So we can steer clear." | P6, P7 | label-only |
| 10 | flavor_cues (flavor family) | "Tap everything that's you" | "Which of these flavors do you love?" | P6 | label-only |

### Option rewrites (the higher-signal fixes)

**coffee** — `Sweet & creamy` is double-barreled (P3); reorder as a clean bitterness ramp:
- `black` "Black" → "Black — bitter's fine"
- `milk_based` "With milk" → "With milk"
- `sweet` "Sweet & creamy" → **"Sweet & mild"** (drop the dairy conflation)
- `none` "I don't do coffee" → "I don't drink coffee"

**water (fizz)** — already a labeled ramp; keep `Love the fizz` / `A little fizz` / `Prefer it flat`.

**sweet_tooth** — `Yes — I love sweet & rich` double-barrels sweetness+body (P3); midpoint is empty (P4):
- `rich` "Yes — I love sweet & rich" → **"I love sweet drinks"**
- `balanced` "No strong preference" → **"A little sweetness is nice"**
- `dry` "I prefer light & not-sweet" → **"I like it dry, not sweet"**
- *Note (structural, optional):* the `rich` value currently also feeds the **body** dial
  (ADR-0005). Dropping "& rich" from the *label* is safe (value code unchanged), but the
  bundling still lives in composition. If you want a clean body signal, add a dedicated
  body question — flag as structural, out of scope for a wording pass.

**strength** — split the bundles (P3), anchor the midpoint to a number (P4):
- `light` "Light & easy-drinking (low alcohol)" → **"Light & low-alcohol"**
- `medium` "Middle of the road" → **"Around 5% — the usual"**
- `strong` "Strong & boozy (high alcohol)" → **"Strong & boozy"**

**sour_foods / smoked_foods** — fix the empty midpoint (P4):
- `okay` "They're okay" → **"Now and then"** (both questions, keep them consistent)

**sour_wild** — de-jargon with everyday anchors (P5):
- `bright` "Bright & citrusy" → **"Bright & fruity (think lemon)"**
- `funky` "Funky & wild" → **"Earthy & funky (think aged cheese)"**

**adventure** — keep; optionally soften the midpoint `Sometimes` → "I'll try new things sometimes" (P4).

**avoids / flavor_cues (CATA)** — options are already concrete; the win is the prompt (above), not the labels.

## Recommendation summary

- **Proxies to keep (concrete, single-topic, decent validity):** sparkling water
  (carbonation), pickles/kombucha (sour), BBQ/smoked food (smoke/roast), dark chocolate
  (bitterness confirm). These name a real everyday thing and map cleanly.
- **Proxy to demote + anchor:** coffee. Keep it as a *secondary* bitterness signal but add
  one **direct** plain-language bitterness question (row 1b) so a whole dial doesn't rest on
  the weakest proxy. This is the single highest-value change and the most likely root of
  "not clear what we're asking" — users sense coffee is a strange thing to ask a beer app.
- **"Why we ask" subtext vs. framing intro:** the quiz already has a good framing intro
  ("no beer knowledge needed… we turn them into a taste profile"). Add per-question subtext
  **only as an A/B test** (evidence is thin), one line, same screen, starting with the two
  weirdest-seeming questions (coffee, pickles).
- **Questions to cut/merge:** none required. The set is already lean (7 core). If a body
  signal is wanted cleanly, *add* a question rather than keep bundling it into sweet_tooth.
- **Do label-only fixes first** (prompts + option splits + midpoints + de-jargon) — they
  directly answer the feedback, are cheap, and carry the strongest evidence. Gate the
  structural changes (direct bitterness anchor; optional body question) behind a second pass.

## Open questions (A/B, not settled)

- Does a one-line "why we ask" rationale raise completion/trust or add load? No verified evidence.
- Does an early/mid-quiz payoff peek cut abandonment without over-promising? No verified metrics.
- Which adjacent-consumable proxies actually predict beer preference well enough to keep,
  and would a short direct anchor set outperform the proxies entirely?
- For taste items specifically, does the neutral midpoint invite enough satisficing to
  outweigh its psychometric benefit?

## Sources

**Cross-modal taste / proxy validity (primary):**
- Ong et al. 2018, *Scientific Reports* — bitter perception & coffee/tea/alcohol (MR, UK Biobank): https://www.nature.com/articles/s41598-018-34713-z
- Cornelis et al. 2021, *Scientific Reports* — bitter/sweet genetics & beverage intake: https://www.nature.com/articles/s41598-021-03153-7
- Hayes et al. 2011, PMC3038275 — TAS2R receptors, compound-specific bitterness: https://pmc.ncbi.nlm.nih.gov/articles/PMC3038275/

**Direct vs. indirect elicitation (primary, risk/time-preference domain):**
- PMC9305924 — direct vs. indirect elicitation, comprehension & framing fragility: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9305924/
- ScienceDirect S2214804325001120 (2025) — same-domain vs. adjacent-domain prediction: https://www.sciencedirect.com/science/article/abs/pii/S2214804325001120

**Survey methodology:**
- Qualtrics — double-barreled questions (secondary; corroborated by Pew/Sage): https://www.qualtrics.com/articles/strategy-research/double-barreled-question/
- Survey Practice / Alwin — label all points vs. endpoints (primary): https://www.surveypractice.org/article/2956-should-i-label-all-scale-points-or-just-the-end-points-for-attitudinal-questions
- PMC5993837 — scale point count & reliability (primary synthesis): https://pmc.ncbi.nlm.nih.gov/articles/PMC5993837/
- Nadler et al. 2024, *METRON*/Springer — neutral-midpoint use (primary): https://link.springer.com/article/10.1007/s40300-024-00276-5

**Cognitive load / progressive disclosure & microcopy (secondary/blog — treat as hypotheses):**
- NN/g — reduce cognitive load in forms: https://www.nngroup.com/articles/4-principles-reduce-cognitive-load/
- RevenueCat — Noom onboarding funnel teardown: https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel/
- The Behavioral Scientist — Noom onboarding critique: https://www.thebehavioralscientist.com/articles/noom-product-critique-onboarding

**Method:** deep-research harness — 5 search angles, 23 sources fetched, 84 claims
extracted, 25 verified by 3-vote adversarial check (23 confirmed, 2 refuted). Refuted (do
not cite): "omitting the neutral midpoint improves reliability"; "coffee and alcohol invert
on the same PROP bitterness genetics." Weakest-evidenced sub-questions (why-we-ask subtext,
payoff microcopy) are flagged as A/B hypotheses throughout.
