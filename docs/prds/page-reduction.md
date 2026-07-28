# PRD: Page Reduction (Swipe-First, Two Decks + Profile)

## Problem Statement

Signed-in Beerolog spreads its core loop across too many peer surfaces — Home, Scan, Picks, Rate, plus a separate Account shell — and renders recommendations as a static, paginated card stack with inline rating taps. The payoff ("what should I drink?") is buried behind a session form and a scroll, the taste profile is a dense section on Home, and menu scan lives on its own route disconnected from the picks it should feed. There is no single, obvious, low-scroll surface that answers *"what do I want to drink right now,"* and nothing about the interaction feels like the fast, tactile, snap-decision experience users expect from a modern taste app.

Beerolog is now maintained **in parallel to a white-label product** and serves as the showcase meant to impress prospective customers and pull future traffic. That raises the bar: the primary interaction must be a polished, demo-worthy, image-forward swipe experience — not a list.

## Solution

Collapse the signed-in app to **two swipe decks + a Profile**, organized around a **known / wanted** taste model, with a Tinder-style swipe as the primary interaction and image-forward cards.

- **Primary nav = 2 destinations: `What I know` · `What I want`** (the decks). `What I want` is home/default.
- **Everything about *you* moves behind the avatar** into a tabbed Account page whose **default tab is Profile (taste)**; account settings become sibling tabs. No account link outside the UserMenu.
- **`What I know`** — swipe to rate beers you recognize (up = loved · right = fine · left = not-for-me), ranked by recognition likelihood, with a search fallback. Builds the taste profile.
- **`What I want`** — accuracy-first recommendation deck: highest match % first, always. Swipe right = want (→ persisted Want-to-try list + positive signal), left = pass, up = must-try. Menu scan is a prominent in-deck action that scopes the deck to a scanned menu. Refined by an optional bottom sheet (vibe + ABV + free text + "haven't tried yet").
- **Least-scroll everywhere:** each deck is one card per viewport; swipe replaces scroll; load-more pagination is deleted; filters are a bottom sheet; only the beer detail page scrolls.
- **Accessibility is non-negotiable:** every swipe ships on-screen button equivalents (pass/want/super-like + undo) per WCAG 2.5.1.

This **supersedes `nav-dashboard-redesign.md`** (four-tab bottom nav → two decks + avatar Profile) and **reintegrates menu scan** — a supported MVP surface — as a Tab 2 action rather than a standalone route. Preserve the existing visual system, ranking engine, and taste model; this is an IA + interaction change, not a re-model.

Full rationale, sources, and the locked decision log: **`docs/page-reduction-research.md`**.

## Research

Deep research (swipe UX, explore/exploit, live tuning, accessibility) and a full grill are recorded in `docs/page-reduction-research.md`. Key load-bearing findings:

| Finding | Source | Decision it drives |
| --- | --- | --- |
| Binary swipe (right=like/left=pass) + super-like is the canonical, intuitive mapping | Tinder UX teardowns; Adobe XD designer interview | Swipe vocabulary for both decks |
| Swipe MUST have a single-pointer button fallback + undo | W3C WCAG 2.5.1 (Level A) | Mandatory on-card buttons |
| Raw novelty lowers *perceived accuracy* for casual users; serendipity = surprising **and** relevant | Springer UMUAI 2026 (n=144); serendipity review | Tab 2 is pure exploit; novelty deferred with Discover |
| Closest analog (Beli) = "been" / "want to try" lists + minimal nav | Beli IA teardowns | Two-deck model + Want-to-try list |
| Live tuning best as continuous manipulation, not free-text; but no slider needed once novelty is deferred | arXiv 2505.04260 / 2507.21884 | v1 refiners = filters + free text only |

**North-star:** time from app open to swiping the first accurate card, and Want-to-try adds per session.

**Not empirically validated:** whether users intuitively grok the known/wanted model — no source tested this exact IA. De-risked by deferring the weakest bucket (Discover/unknown) and validating the two-deck model first.

## User Stories

1. As a signed-in user, I want two clear decks — `What I know` and `What I want` — in the primary nav, so that the core loop is two taps, not five surfaces.
2. As a signed-in user on `What I want`, I want to swipe right to save a beer I want and left to pass, so that choosing feels like a fast snap decision.
3. As a signed-in user, I want a right-swipe to add the beer to a persisted **Want-to-try** list on my Profile, so that I can act on it later at the bar.
4. As a signed-in user, I want a super-like (swipe up) to pin a beer to the top of my Want-to-try list, so that my strongest picks stand out.
5. As a signed-in user, I want the first card to always be my highest-match beer, so that the main deck feels accurate immediately.
6. As a signed-in user, I want an optional filter sheet (vibe, ABV, free text, "haven't tried yet"), so that I can narrow the deck toward what I want without leaving the screen.
7. As a signed-in user at a bar, I want a prominent "scan a menu" action on `What I want` that scopes the deck to that menu's beers, so that I'm told what to order from what's actually available.
8. As a signed-in user on `What I know`, I want to swipe to rate beers I recognize (loved / fine / not-for-me), so that I teach my profile quickly.
9. As a signed-in user who knows exactly which beer to log, I want a search fallback on `What I know`, so that I don't have to swipe to find it.
10. As a keyboard or screen-reader user, I want on-screen buttons (pass / want / super-like / undo) equivalent to every swipe, so that the app is usable without gestures (WCAG 2.5.1).
11. As a new user with no profile, I want to land on a usable default deck immediately with a highly visible option to take the taste quiz, so that I'm never gated or shown an empty screen.
12. As a new user who skipped the quiz, I want a persistent, visible way to take it later, so that I can sharpen my picks whenever I choose.
13. As a signed-in user, I want image-forward cards where the beer photo fills the card, so that browsing is visual and fast.
14. As a signed-in user, I want each surface to fit one viewport with no page scrolling, so that I swipe instead of scroll.
15. As a signed-in user, I want my avatar to open an Account page that opens on my taste **Profile** (radar, Want-to-try, history, share), with Details/Security/Settings as sibling tabs, so that everything about me is in one place, taste first.
16. As a Hebrew (RTL) user, I want swipe directions, labels, and the card layout to mirror correctly, so that the deck works in Hebrew.
17. As a maintainer, I want Discover, the novelty slider, and the draggable radar explicitly deferred, so that v1 ships the two-deck core without speculative surfaces.
18. As a reviewer, I want this PRD to supersede `nav-dashboard-redesign.md` where nav conflicts, so that two-decks-plus-avatar-Profile is the authoritative signed-in IA.

## Implementation Decisions

- **Scope boundary:** ADR 0001 holds. Menu scan, quiz, menu-scoped recommendations, ratings, and taste profile are in supported MVP; group/venue-QR/social remain deferred.
- **Primary nav = 2 destinations** (i18n labels): `What I know` → rate deck, `What I want` → recommendations deck (home/default). Reuse/extend the `signedInNav` config; drop the 4-item set from `nav-dashboard-redesign`.
- **Account = tabbed page reached only via the UserMenu avatar.** Tabs: **Profile** (taste) ‹default› · **Details** (today's `/account/profile` name/avatar, renamed) · **Security** · **Settings**. Home's `TasteProfileSummary` moves into the Profile tab.
- **One shared card component, image-forward.** Rewrite `RecommendationBeerCard` into a full-bleed swipe card: hero image (`object-cover`, fills height) with a **designed color-swatch fallback** (glass silhouette tinted by `color`); overlays = match % (top-start), super-like (top-end), name + brewery, **max 2 pills** (style + ABV), one why-line in the scrim. Deep facts (IBU, sensory radar, venues) move to the `/beer/$id` tap-through. No in-card scroll.
- **Swipe engine reuses `RateDeckFlow`** as the shared deck; both tabs share it, differing only in candidate source and swipe vocabulary. Every deck renders button equivalents + undo (WCAG 2.5.1).
  - `What I know`: up=loved · right=fine · left=not-for-me → existing `/ratings` POST (optimistic). Deck ranked by recognition likelihood. Retain search mode.
  - `What I want`: up=must-try · right=want · left=pass. Right/up persist to a new **Want-to-try** store; all three feed the taste signal.
- **Recommendations = pure exploit**, highest match first. **Re-rank at batch boundaries, not per-swipe:** swipe signals post immediately; the next batch reflects accumulated swipes. Filters/free-text re-query immediately.
- **Refiners** reuse `SessionQuickPick` (vibe + ABV + free text) + a new "haven't tried yet" toggle, presented as an optional **bottom sheet**; vibe/ABV become optional (baseline-only deck loads without them via the existing `/recommendations` baseline path). α/β stay hidden.
- **Menu scan is its own first-class feature**, not part of the filter sheet or free text. It surfaces as a prominent, dedicated action on Tab 2 (camera button in the header + primary CTA on empty/first-load): reuse `/menu/scan`; on success the deck reloads scoped to extracted beers with a "Showing: [menu] · clear" chip. The menu-scan AI chat stays part of the menu-scan feature (kept or deferred *within* that feature's slice) — never merged into the Tab 2 free-text refiner. It gets its own vertical slice.
- **Deck paging:** batch ≈ 15 (raise `RECS_PAGE_SIZE` or a deck-specific constant), preload next batch at ≈ 4 remaining, delete the load-more button; friendly end-of-deck terminal card.
- **Cold start:** default-profile deck for no-profile users (no wall); quiz CTA as the first card **and** a persistent header entry until a profile exists; Profile tab shows an incomplete-profile state.
- **Least-scroll:** decks fill `100dvh` minus nav (`dvh` for mobile chrome); filters as bottom sheet; Profile fits ~one viewport with horizontal Want-to-try/history rows; only `/beer/$id` scrolls.
- **New persistence:** a Want-to-try list (beer id + wanted/must-try state + timestamp per user). Prefer a small API surface (`POST/GET/DELETE /me/want-to-try` or equivalent) + a react-query hook, mirroring the ratings pattern. Confirm schema during slicing; keep migrations idempotent (see memory: Drizzle CI note).
- **Analytics:** new typed swipe/want events (`beer_swiped` with direction/deck, `want_to_try_added`, `menu_scan_scoped`), consent-gated as today.
- **Deferred, no code in v1:** Discover deck, novelty/explore slider, draggable taste radar (radar stays read-only on Profile), natural-language-vs-slider reconciliation.

## Testing Decisions

- Behavior-first through public UI: rendered nav destinations (exactly two), avatar-menu Account entry, Account tab order with Profile default, deck swipe → correct signal, right-swipe → Want-to-try list membership, super-like → pinned, button-equivalents present and operable, undo reverts.
- Accessibility test: each deck exposes accessible name + button fallback for every swipe action; assert roles/labels, not gesture internals.
- Recommendations: highest-match-first ordering; filters/free-text trigger immediate re-query; swipe signals do not reshuffle the current batch; batch preloads at threshold; end-of-deck card renders.
- Menu scan: scoping reloads the deck to extracted beers and the clear chip restores the full deck.
- Cold start: no-profile user gets a default deck (not an empty state) and a visible quiz CTA (first card + persistent entry).
- Card: image renders when present; color-swatch fallback renders when absent; no in-card scroll region.
- RTL: swipe direction and card layout mirror in Hebrew.
- Test modules mirror prior art: route component tests stubbing `createFileRoute`/Clerk `Show`; do not assert CSS class strings as the contract. Keep new Want-to-try API/hook unit-covered.

## Out of Scope

- **Discover / "unknown" deck** and any novelty-surfacing UI (deferred, designed in the research doc).
- **Novelty/explore slider and draggable taste radar** (radar stays read-only).
- Changing the recommendation ranking algorithm, taste model, session-intent schema, or rating taxonomy (interaction/IA change only).
- Group sessions, venue QR, leaderboards, challenges, badges, operator/bar tooling.
- Rebrand / new design system.
- Signed-out surfaces (landing, `/try`, sign-in/up, age gate) beyond what nav consolidation touches; decks stay signed-in only.
- Backfilling the 68 imageless catalog beers is **not in the v1 slice** but is a **near-term follow-on** (not long-deferred) — images are expected to be sourced easily via the existing `upload_images_to_blob.ts` pipeline. v1 ships on the designed swatch fallback; the backfill lands shortly after so cards are image-forward in practice.

## Further Notes

- **Supersedes:** `nav-dashboard-redesign.md` (nav model). **Related:** `venue-and-menu-scan.md` (scan reused as Tab 2 action), `beer-rating-feedback.md` (rating signals), `profile-history-polish.md` (Profile tab content), `results-polish.md` (picks as payoff), `beer-detail-view.md` (`/beer/$id` deep-dive).
- **ADRs:** 0001 (scope), 0003/0005 (taste model — unchanged), 0004 (accessibility — WCAG button fallback obligation), 0006 (rating feedback loop).
- **Near-term follow-on (not long-deferred):** catalog image backfill for the 68 imageless beers via `upload_images_to_blob.ts` — do this shortly after v1 so cards are genuinely image-forward.
- **Longer-deferred follow-ons:** Discover deck + serendipity engine; novelty slider / draggable radar.
- **Type:** enhancement (IA + interaction). **Planning status:** ready for `/to-issues` vertical slicing once approved. Suggested slice order: (1) shared image-forward swipe card, (2) two-deck nav + Account tabs + Profile move, (3) `What I want` deck + batch paging + refiner sheet, (4) Want-to-try persistence + Profile list, (5) `What I know` deck reframe + search, (6) menu-scan scoping, (7) cold-start default deck + quiz CTA, (8) analytics + a11y verification.
