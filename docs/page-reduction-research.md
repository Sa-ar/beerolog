# Page Reduction — Research & Design Direction

**Status:** Research artifact (pre-PRD). Feeds `/grill-with-docs` → `/to-prd`.
**Date:** 2026-07-28
**Context:** Beerolog is kept in parallel to the white-label product — this site is the showcase meant to impress customers and drive future traffic, so the swipe UX doubles as the demo "wow" surface.

> **v1 scope is defined in §"v1 Decisions (locked via grill 2026-07-28)" at the bottom — it supersedes the exploratory sections above where they differ** (notably: Discover is deferred; no novelty slider/draggable radar in v1; primary nav = 2 decks with Profile behind the avatar).

## Goal

Collapse the current ~16-route web app into **2 main swipe decks + a Profile** for v1 (a third "Discover" deck is designed but deferred), organized around a **known / wanted / unknown** taste model, with a Tinder-style swipe interaction.

| Tab | Bucket | Job (why it exists) | Deck source | Reuse |
|-----|--------|---------------------|-------------|-------|
| 1 | What I know | Swipe through beers you recognize → rate/log them. Retrospective; **builds the profile.** | Catalog, ranked by recognition likelihood | `RateDeckFlow` (already a swipe deck), `/me/ratings` |
| 2 (home/default) | What I want | Main feed. Swipeable recommendations seeded from the profile, re-ranking live as you swipe. **Accuracy-first.** | `/recommendations` payload, live-refined | `RecommendationBeerCard` wrapped in a swipe deck |
| 3 | Discover / Surprise me | Serendipity: surprising **but still relevant** picks outside the usual. **Not random.** (Option A — see below.) | Same rec engine, novelty dial up, relevance-gated | Same deck, different query param |
| 4 | Profile | Taste radar + history. Its own page, nothing more. | `TasteProfileSummary` lifted out of Home | Already built |

## Decisions locked (owner)

1. **Option A** for the "unknown" bucket: Discover is a real tab, framed as *adventurous-but-safe* ("beers outside your usual we think you'll still love"), **not** a raw-novelty feed.
2. **Accuracy is crucial on Tab 2.** The first thing the user sees is their highest-match beer. Novelty is confined to Tab 3. Filters + free text on Tab 2 are **refiners** (narrow toward what the user wants), never randomizers.
3. **Image-forward beer cards** — the visual is the card.
4. **Least-scroll everywhere** — one viewport per surface; swipe replaces scroll.

## Swipe mechanics (research-verified)

- **Right = want/like, left = pass** — canonical since 2012; the gesture mimics a real snap decision and gives a sense of control a tap button can't. [redrocket, xd.adobe]
- **Super-like** = a third, heavier signal ("must-try / love this"), weighted more strongly in the taste model. [techcrunch]
- **Undo/rewind** — required for a fast deck.
- **Button fallback is mandatory, not optional.** WCAG **2.5.1 Pointer Gestures (Level A)** classifies swipe as a path gesture requiring a single-pointer alternative. Beerolog targets SI 5568 / WCAG 2.0 AA, so this is in-scope. Ship on-screen **pass / want / super-like + undo** buttons alongside the gesture (Tinder does this too). This also serves keyboard/non-touch users. [w3.org, wcag.com]

## Accuracy vs. novelty — how the dial sits

Research (144-user Spotify study, UMUAI 2026) found exploration-heavy feeds score higher on novelty/serendipity but **lower on perceived accuracy** — buffered only for users deeply invested in the domain (beer geeks). Serendipity means **surprising AND relevant**, never raw-novel. [Springer UMUAI; ResearchGate serendipity review]

Therefore:
- **Tab 2 defaults hard to exploit.** Highest match % first, no novelty injected on the critical path.
- **All novelty lives in Tab 3**, opt-in.
- **Filters + free text refine, don't randomize.** Free text uses the existing locale-aware LLM to read intent; filters/slider are the fast path. They tighten relevance.

## The "second form" = draggable taste radar (not a re-run of the vibe form)

1. **Swipes are the primary live signal** — each swipe re-weights the deck in-session.
2. **The explicit control is a continuous slider, NOT free-text entry** — direct manipulation beats asking users to articulate preferences (fails at cold start) and empirically raises sense-of-control. [arXiv 2505.04260, 2507.21884]
3. **Reuse the existing 8-axis taste radar** (bitterness, sweetness, body, hoppy, malty, roasty, sour, **novelty**). Make the axes draggable → live re-rank. The `novelty` axis **is** the explore/exploit dial (Tab 3 / Profile control — the accuracy-first Tab 2 user never has to touch it).
4. *Optional later:* natural-language steering ("less bitter", "hoppier") — a Letterboxd study (n=19) found it significantly improved perceived control. Complement to the slider, not a replacement. [arXiv 2510.12742]

## Image-forward beer card

Today's `RecommendationBeerCard` is a horizontal row (small image + chips + why-line + rating tapper). For a swipe deck, invert it — the image becomes the card:

```
┌─────────────────────────┐
│  [92% match]      ★ save │  ← match % top-left, super-like top-right
│      FULL-BLEED         │
│      BEER IMAGE         │  ← hero: fills card height, object-cover
│   (color swatch         │     (color field pale→dark = fallback)
│    fallback if none)    │
│ ▓▓▓ gradient scrim ▓▓▓  │
│  Goldstar · Tempo       │  ← name + brewery
│  Lager · 4.9%           │  ← 2 pills max: style + ABV
│  "Crisp and clean —     │  ← why-line (the differentiator)
│   your go-to profile."  │
└─────────────────────────┘
   ✗ pass   ↺ undo   ♥ want   ← button fallback (WCAG 2.5.1)
```

- **Image is the hero** — fills card height; color swatch is the graceful fallback (already built).
- **Match %** stays visible — the trust signal, critical on accuracy-first Tab 2.
- **Why-line** in the scrim, one line. Keep existing rules: unique per-beer LLM text, match explanation lives *in the why*, don't repeat style already shown in pills.
- **Max 2 pills** (style + ABV). IBU/sensory radar/venues move to the tap-through `/beer/$id` detail — the card is for the snap decision.
- One component, three tabs — only the deck's contents differ.

## Least-scroll design

A swipe deck is inherently one-card-per-viewport. This mostly means **deleting** existing scroll:

- **Tabs 1–3:** one card fills `100dvh` minus nav (`dvh` so mobile browser chrome doesn't clip). Advance by swiping, never scrolling. **Kills the `/recommendations` vertical stack + load-more pagination** (the anti-pattern). Cards preload behind the top one.
- **Card face:** no internal scroll; deep facts live behind the tap-through (the one place scrolling is fine).
- **Filters / free text (Tab 2):** a **bottom sheet** that slides over the deck and dismisses — never pushes the card down or adds page height. Zero layout shift.
- **Profile (Tab 4):** radar + top flavor tags + rating count above the fold; rated-beer history as a **horizontal** thumbnail row, not a long vertical list.

## Migration map (16 routes → 3 + 1 nav)

- `/rate` → **Tab 1** (reframe "rate" as "what I know")
- `/recommendations` + `/menu` scan → **Tab 2** (menu-scan becomes an input *mode*, not a nav item)
- *new* Discover deck → **Tab 3** (thin wrapper on the rec engine)
- Home's `TasteProfileSummary` → **Tab 4 / Profile** (lift out of `/`)
- **Stay, off main nav:** `/try`, `/onboarding`, `/beer/$id`, `/taste/$key`, `/account/*`, `/signin`, `/signup`, `/legal/*`
- **`SessionQuickPick` vibe/ABV form** → folds into the Tab 2 bottom-sheet refiner

## Open questions (for `/grill-with-docs`)

1. Do users intuitively grok a 3-tab known/wanted/unknown IA, or does Discover die? No source tested this specific IA — needs usability testing.
2. Cold-start default dial position for a brand-new user, and how fast it shifts toward explore as swipes/ratings accumulate.
3. Deck batch/preload size + swipe-fatigue threshold for beer (dating-app numbers may not transfer). Working default ~10–15 behind the top card.
4. Exactly which filters make the cut on Tab 2 (style, ABV, color, …).
5. If NL steering is added: how it reconciles with the slider when they conflict.

## Refuted / excluded claims

- "Explore/exploit preference tracks interaction-history length" — **refuted** (1-2 vote), do not rely on.
- "WCAG 2.5.7 Dragging Movements is strictly mandated at Beerolog's exact target level" — **refuted** (0-3): 2.5.7 is a WCAG 2.2 criterion, above the SI 5568 / WCAG 2.0 AA target. The button-fallback recommendation stands regardless via 2.5.1 (Level A).

## Sources

- Tinder swipe UX: redrocket.software, medium.com/design-bootcamp, xd.adobe.com, techcrunch.com
- Accessibility (primary): w3.org WCAG 2.5.1 / 2.5.7, tetralogical.com, wcag.com
- Explore/exploit + serendipity (peer-reviewed): Springer UMUAI 10.1007/s11257-026-09445-9, ResearchGate UI-Facilitated Serendipity review
- Live tuning (arXiv): 2505.04260 (steerable interfaces), 2507.21884 (exploration coefficient α), 2510.12742 (CTRL-Rec natural-language control)
- Closest product analog: Beli (been / want-to-try / feed IA) — ixd.prattsi.org, startupsignals.substack.com

**Confidence caveats:** No source directly studied a 3-tab known/wanted/unknown IA in a beer/taste app — that structure is a reasoned synthesis, not a validated pattern (hence open question 1). Live-tuning user studies are small (n=14, n=19); the α study is a movie-dataset preprint (treat magnitudes as directional). Accessibility findings rest on authoritative W3C primary standards and are the most solid.

---

# v1 Decisions (locked via grill 2026-07-28)

**Scope: 2 swipe decks + Profile.** Discover deferred.

### IA & navigation
- **Primary nav = 2 items: What I know · What I want** (the two decks). "What I want" is home/default.
- **Profile is the default tab of a tabbed Account page, reached via the UserMenu avatar** (sidebar bottom / mobile top) — no account link outside the UserMenu. Account tabs: **Profile** (taste) ‹default› · **Details** (name/avatar, today's `/account/profile`, renamed to avoid collision) · **Security** · **Settings** (language/legal/export/delete).
- **Discover deferred** — revisit after Tab 2 accuracy is proven. Same deck/card, different query param, so it's cheap to add.
- Everything about *you* (taste, want-to-try, settings) lives behind the avatar, taste-first.

### Tab 1 — What I know (rate what you recognize)
- **3-direction swipe** = existing rating scale: **up = loved · right = fine · left = not-for-me**. Buttons below mirror 1:1 (WCAG 2.5.1 fallback).
- Deck **ranked by recognition likelihood** (mainstream/popular first).
- **Search mode retained** as secondary affordance (log a specific known beer fast). Reuses existing `/rate` search.
- Purpose: builds/refines the taste profile.

### Tab 2 — What I want (home, accuracy-first)
- **Pure exploit: highest match % first, always.** No novelty injected on the critical path.
- **Swipe: right = want · left = pass · up = must-try (super-like).**
  - Right → persists to a **"Want to try" list** (viewable on the Profile tab) **and** feeds a positive taste signal. Left = mild negative signal. Super-like = pinned to top of the list, weighted heavier.
- **Re-rank at batch boundaries, not per-swipe.** Each swipe posts its signal immediately (optimistic); the next batch fetch reflects accumulated swipes. Filters/free-text, by contrast, **re-query immediately**.
- **Refiners (bottom sheet, all optional):** the existing session form — **vibe** (refreshing/cozy/adventurous/familiar) + **ABV** (low/med/high/any) + **free text** (routed to the locale-aware LLM) — **plus a "haven't tried yet" toggle.** Reuses `SessionQuickPick` + the `/recommendations` `session` param; today's required vibe+ABV become optional. α/β stay hidden. **No novelty slider / draggable radar in v1** (that was Discover's; radar stays read-only on Profile).
- **Scan a menu = a prominent action on Tab 2, not a nav tab.** Camera button in the header (and a primary CTA on empty/first-load). Scan → deck reloads **scoped to the menu's beers**, with a "Showing: [menu] · clear" chip. Same deck/card/mechanics.
- **Cold start = default deck + very-visible optional quiz CTA** (no quiz wall). New user lands on a default-profile deck immediately; swipes personalize from card one. Quiz CTA = **first card in the deck** + a **persistent "Sharpen your picks" entry in the header that stays until a profile exists**; Profile tab shows an "complete your taste profile" state.
- **Deck: ~15 per batch, preload next when ~4 remain** (replaces load-more). **End-of-deck** = friendly terminal card ("That's tonight's best matches. Adjust filters, scan a menu, or check your Want-to-try list."). 15 is a tunable constant.

### Beer card (image-forward)
- **Image is the hero, fills card height** (`object-cover`). **82% of the catalog (301/369) has images**; the rest use a **designed color-swatch fallback** (beer-glass silhouette tinted by the `color` field — not an empty box). Backfill the 68 missing via the existing `upload_images_to_blob.ts`.
- On-card: match % (top-left), super-like (top-right), name + brewery, **max 2 pills** (style + ABV), one why-line in the scrim (unique per-beer LLM text; match reason in the why, not repeated in pills). IBU/sensory radar/venues move to the `/beer/$id` tap-through. **No scroll inside the card.**
- One card component, both decks — only the deck's contents/swipe-vocabulary differ.

### Least-scroll
- Each deck = one card filling `100dvh` minus nav; **swipe replaces scroll**; load-more pagination deleted.
- Filters = bottom sheet (slides over, dismisses, zero layout shift).
- Profile fits ~one viewport: radar + top tags + rating count above fold; history + want-to-try as horizontal thumbnail rows.
- Only `/beer/$id` scrolls (deliberate deep-dive).

### Profile tab (taste)
- Read-only taste radar, **Want-to-try list** (Tab 2 output), rating history (horizontal), share-archetype, and a take/redo-quiz entry.

### Migration (v1)
- `/rate` → **Tab 1**; `/recommendations` + `/menu` scan → **Tab 2** (scan = scoped-deck action); Home's `TasteProfileSummary` → **Profile tab** of Account; `SessionQuickPick` → Tab 2 bottom-sheet refiner.
- Stays, off primary nav: `/try`, `/onboarding`, `/beer/$id`, `/taste/$key`, `/account/*` (now tabbed), `/signin`, `/signup`, `/legal/*`.
- Decks remain **signed-in only** (unchanged auth gating); signed-out landing/`/try` unchanged.

### Menu scan
- **Its own first-class feature**, not part of the filter sheet / free text — a dedicated Tab 2 action (camera button + first-load CTA) that scopes the deck to a scanned menu. The menu-scan AI chat stays inside this feature; it is never merged into the Tab 2 free-text refiner.

### Images
- Imageless-beer backfill (68 of 369) is a **near-term follow-on, not long-deferred** — sourced via existing `upload_images_to_blob.ts`. v1 ships on the designed swatch fallback.

### Deferred (longer)
- Discover deck (whole tab). Novelty slider / draggable radar. Natural-language vs structured-filter reconciliation (no slider in v1, so moot). Exact swipe analytics events to finalize in PRD/slices.

