# Quiz UX Research & Recommendations

Research-backed review of the taste quiz (`QuizStepper`, `QuizChips`,
`/onboarding`, `/try`) against current form/quiz UX evidence. Each item is
mapped to our code with an impact/effort call. Sources at the bottom.

## Implementation status

**Shipped:** #1 radio/checkbox a11y via native inputs (single tab stop, arrow
keys) + auto-advance gated to `pointerup` (keyboard gets an explicit Next);
#2 mobile above-fold padding; #3 outcome-framed submit hint; #4 inline
`(optional)` labels; #5/D4 fade transitions; #6 "Answers saved" + "Almost
there" microcopy; D3 chalk-tick selection microinteraction; D2 reveal fade
(the radar viz in `TasteProfileSummary` already existed). All verified in
browser; 59/59 tests pass.

**Shipped — D1 (visual answer icons):** added `src/components/quiz-icons.tsx`,
a local chalk-line glyph set for the quiz enums (the `CatalogIcon` catalog
doesn't cover them). An `Intensity` glyph (1-3 rising bars) serves every scale
question — which also gives them the left→right ramp (D5) — plus option-level
doodles for the categorical groups (coffee/choco/love/sour_wild/avoid/cue).
`QuizIcon` returns null for any unmapped option, so cards fall back to
text-only. Glyphs use `currentColor` (dark ink on the gold selected card, cream
otherwise) and match the @beerolog/icons hand-drawn style. Easy to refine —
edit one entry in the `GLYPHS` map.

**Deferred by request — the ratings loop** (Vivino-style implicit profiling).

## What the evidence says (headline numbers)

- **One-question-per-screen / multi-step beats one long page** for engagement:
  Formstack found multi-step forms convert ~25% better than single-page; micro-
  commitment lifts conversion 20-40%. **Caveat:** conversational/one-at-a-time
  starts *hurting* past ~12-14 questions, and in controlled usability studies a
  well-built single page sometimes wins on raw speed. Our quiz is ~9-12
  adaptive questions — inside the safe zone, but we should resist adding more.
- **Progress indicators lift completion 12-18%.** We already have a bar +
  "Question X of ~N". Good.
- **Outcome-framed microcopy lifts conversion up to ~17%** ("See your matches"
  vs a bare button).
- **First question must be above the fold on mobile** — "the single most
  repeated UX rule in the field." If users scroll to reach it, ~half drop.

## Prioritized recommendations

| # | Change | Impact | Effort |
|---|--------|--------|--------|
| 1 | Fix radio-group keyboard a11y + reconcile auto-advance | High | Med |
| 2 | Ensure Q1 is above the fold on mobile | High | Low |
| 3 | Outcome-framed microcopy on the start + submit CTAs | Med-High | Low |
| 4 | Label optional questions inline (not just a Skip button) | Med | Low |
| 5 | Smooth the question transition (reduce auto-advance abruptness) | Med | Low |
| 6 | "X of ~N" honesty + a "saved" reassurance line | Low-Med | Low |

---

### 1. Radio-group keyboard a11y + the auto-advance tension (top issue)

This is the one that contradicts a decision we made, so flagging it directly.

`QuizChips` renders `role="radio"` cards as individual `<button>`s. Two gaps vs
the WAI-ARIA radio pattern:
- **Every card is its own tab stop.** A radio group should be a *single* tab
  stop, with **Arrow keys** moving the selection and Tab leaving the group. 95%
  of sites get this wrong; we currently do too (a 4-option question = 4 tab
  stops, no arrow nav).
- **Auto-advance fights screen-reader/keyboard use.** Guidance is explicit: a
  radio group's selection "should only be saved when the user explicitly
  submits it," and auto-advancing on selection "deviates from accessibility
  best practices." For a keyboard user, moving through options with arrows would
  fire navigation on each move — they could never *browse* options.

**Reconciliation (keeps the conversion win, fixes a11y):**
- Implement the real radio pattern: roving `tabindex`, Arrow-key selection,
  Space/Enter to choose. Easiest path is visually-hidden native
  `<input type="radio">` + styled `<label>` cards — native keyboard semantics
  for free, delete custom key handling.
- **Gate auto-advance to pointer/tap only.** Keyboard selection should *not*
  auto-advance; show the explicit Next we already built and let Enter advance.
- Announce advancement via the existing `aria-live` region so SR users aren't
  silently moved.

This preserves the fast tap-to-advance feel for the majority (touch/mouse)
while making the quiz keyboard- and SR-navigable.

### 2. First question above the fold on mobile

The landing board (`/try`, `/onboarding`) wraps the stepper in a framed card
with generous padding. On a 375px viewport, verify the first question's options
are visible without scrolling — trim board padding / hero height on small
screens if not. Cheapest high-impact fix in the list.

### 3. Outcome-framed microcopy

- Start screen: one line stating the payoff ("Answer ~9 quick questions → see 5
  beers matched to your taste"). We have an intro; make it outcome-first.
- Submit button reads "Create my taste profile" (good — outcome, not "Submit").
  Add a one-line subtext under it: "Free, and your profile stays with your
  account." (We already show a hint on `/`; mirror it at the quiz end.)

### 4. Mark optional questions inline

NN/g: explicitly distinguish optional questions to "reassure users they can
skip." `avoids` and `flavor_cues` are optional but only signaled by a Skip
button. Add an inline "(optional)" tag in the question heading so the Skip
isn't a surprise.

### 5. Smooth the transition

Auto-advance currently swaps questions instantly (we key on `current.id`, so
React remounts). A 150-200ms fade/slide makes the jump feel intentional rather
than jarring — we already have a `fadeIn` keyframe in `styles.css`; apply it to
the question container, respecting `prefers-reduced-motion` (already handled
globally).

### 6. Progress honesty + saved reassurance

- "Question X of ~N": the `~` is honest for the adaptive path — keep it. NN/g
  notes non-linear/approximate bars can even *help* by creating positive
  surprises when the total shrinks.
- Add a quiet "Answers saved" line (we now persist to `localStorage`) —
  transparency that progress is saved reduces abandonment anxiety.

## Round 2 — Visual design & delight

The first round was flow/UX. This round is the *look and feel* — where the
biggest untapped wins are, and where our chalkboard theme can do real work.

### Strategic callout: do we even need a long quiz? (read first)

Vivino — the category leader in taste-based recommendations — **deliberately
has no quiz**: "you'll never need to take a quiz — personalization happens
through rating wines instead," and its algorithm engages after ~5 ratings.
Beerolog already has ratings as a core loop. Implication: treat the quiz as a
**cold-start primer, not the personalization engine**. Keep it short (the
evidence caps conversational quizzes at ~12-14 Qs; we're at ~9-12 — don't grow
it), and make the quiz→ratings relationship visible ("your profile sharpens as
you rate"). This reframes every design decision below as "make a *short* quiz
delightful," not "build an epic quiz."

### Prioritized (design)

| # | Change | Impact | Effort |
|---|--------|--------|--------|
| D1 | Visual answer options — a chalk icon per option card | High | Med |
| D2 | Make the taste-profile reveal feel like a payoff | High | Med-High |
| D3 | Selection microinteraction (chalk tick/draw-on) | Med-High | Low-Med |
| D4 | Question transition animation (200-300ms) | Med | Low |
| D5 | Scale questions ordered as a visual intensity ramp | Med | Low |
| D6 | Anticipation microcopy near the end | Low-Med | Low |

### D1. Visual answer options

Strongest single design lever in the evidence: image/icon answer choices can
lift completion **up to 40%**, are processed far faster than text, cut
straight-lining, and reduce cognitive load — best at **4-6 options** (our
single-choice questions are 3-4; ideal). Our option cards are text-only.
- Add a chalk-style icon to each card via the existing `CatalogIcon` catalog
  (we already use it for flavor/journey groups; it was on the home steps before
  the redesign). Render `CatalogIcon group={q.group} iconKey={option}` above the
  label where the catalog has art; fall back to text-only otherwise.
- This needs icon coverage for the quiz enum groups (coffee, choco, fizz, sweet,
  strength, love, adventure, …). Audit the catalog first; commission/borrow
  chalk-line glyphs for gaps. The hand-drawn line style matches `ChalkRule`.

### D2. The reveal as the reward

The payoff of any taste quiz is the *reveal*; anticipation → reward is the core
gamification loop. Today `TasteProfileSummary` shows flavor badges + linear
meters — functional, not a "moment."
- Treat `TasteProfileLoadingState` → summary as an **unveiling**: a brief
  "writing your profile on the board" chalk draw-in (SVG stroke animation),
  then the result. Build a beat of anticipation, don't just swap screens.
- Consider a **radar/spider chart** of the taste dimensions as the hero viz
  (radar charts are the established pattern for multi-trait personality/taste
  reveals, e.g. FiveThirtyEight). It reads as "your unique shape," more
  memorable and shareable than stacked bars. Keep the meters as the detail
  breakdown below it.
- Shareability: a chalkboard-framed "taste card" is naturally screenshot-worthy
  — cheap organic growth.

### D3. Selection microinteraction

Instant feedback (0.1-0.3s) confirms the choice and adds delight. On select,
draw a small **chalk tick** or underline-scribble on the card (SVG stroke
draw-on, ~200ms ease-out) — same motif as `ChalkRule`. Honors
`prefers-reduced-motion` (already global).

### D4. Question transition

Auto-advance currently hard-cuts between questions (we remount on
`current.id`). Add a 200-300ms fade/slide — ease-out on exit, ease-in on entry
(the evidence's standard range). We already have a `fadeIn` keyframe in
`styles.css`; apply it to the question container.

### D5. Scale questions as a visual ramp

For 3-option intensity scales (light/medium/strong, low/med/high), order the
cards as a left→right ramp and hint the scale visually (a subtle size or
fill-weight step, or a thin gradient track behind them) so the scale is legible
at a glance rather than read as three unrelated chips.

### D6. Anticipation microcopy

Near the last question, a line like "Almost there — one more and we'll pour your
matches" reduces perceived length and frames the reward. Pairs with the
outcome-framed CTA from round 1 (#3).

## What's already strong (keep)

- **Recognition over recall:** everyday-flavor framing ("pickles, kombucha?")
  instead of beer jargon — textbook cognitive-load reduction.
- **One question per screen, big tap targets, single column** — all aligned
  with the evidence.
- **Adaptive branching (wizard)** hides irrelevant questions — NN/g-recommended.
- **Editable review + persistence + back/prefill** — matches "transparency:
  progress is saved" and lets users correct without losing work.
- **Progress indicator** present.

## Sources

- [NN/g — 4 Principles to Reduce Cognitive Load in Forms](https://www.nngroup.com/articles/4-principles-reduce-cognitive-load/)
- [NN/g — Wizards: Definition and Design Recommendations](https://www.nngroup.com/articles/wizards/)
- [NN/g — Progress Indicators Make a Slow System Less Insufferable](https://www.nngroup.com/articles/progress-indicators/)
- [Single-question vs long forms: the data](https://rowform.io/blog/single-question-vs-long-forms-the-data-on-why-single-question-forms-win/)
- [One-question-at-a-time vs single-page (Fillout)](https://www.fillout.com/blog/one-question-at-a-time-form)
- [Single-page vs multipage vs conversational forms in healthcare — usability study (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8190652/)
- [Advanced quiz funnel tactics 2025 (Playerence)](https://playerence.com/advanced-quiz-funnel-strategy/)
- [Quiz engagement benchmarks / completion rates (Outgrow)](https://outgrow.co/blog/quiz-engagement-benchmarks-completion-rates)
- [USWDS — Radio buttons accessibility tests](https://designsystem.digital.gov/components/radio-buttons/accessibility-tests/)
- [W3C WAI — Keyboard Accessible (WCAG 2.1)](https://www.w3.org/WAI/WCAG22/Understanding/keyboard-accessible.html)
- [Creating accessible styled radio groups (Evinced)](https://www.evinced.com/blog/creating-accessible-styled-radio-groups)
- [Image surveys: using images as answer choices (ProProfs)](https://www.proprofssurvey.com/blog/image-surveys/)
- [Image answers for visual question engagement (RightMessage)](https://rightmessage.com/articles/introducing-image-answers-for-visual-question-engagement)
- [Vivino — My Taste Profile](https://www.vivino.com/releases/mytasteprofile)
- [Vivino — Your unique taste visualized](https://www.vivino.com/en/wine-news/your-unique-taste-visualized)
- [How microinteractions & motion shape UX (timings)](https://njtechpioneers.com/blog/how-microinteractions-and-motion-are-shaping-ux-in-2025/)
- [Gamifying quizzes — rewards & anticipation (Estha)](https://estha.ai/blog/a-complete-guide-to-gamifying-quizzes-with-leaderboards-and-rewards/)
- [Quiz engagement benchmarks / completion rates (Outgrow)](https://outgrow.co/blog/quiz-engagement-benchmarks-completion-rates)
