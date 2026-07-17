# PRD: Nav + Dashboard Redesign (Get Picks Fast)

## Problem Statement

Signed-in Beerolog buries the product’s payoff. The sticky header promotes “Rate beers” while `/recommendations` — the core outcome — has no global entry. Home (`/`) stacks persona, radar chart, session quick-pick, and rating copy in one dense column, so the first viewport feels like a taste museum instead of “what should I drink tonight?” Account destinations appear twice (avatar menu tabs and `/account` shell tabs). Quiz completion lands on the dashboard instead of picks, adding an extra step after onboarding.

Users who open the app to get picks fast experience clutter and wayfinding friction even though the header chrome itself is sparse.

## Solution

Redesign signed-in navigation and the home information architecture around one north-star: **minimize time to first pick**.

- Persistent primary nav with three destinations: Tonight, Picks, Rate beers.
- Desktop (`md+`): left/start sidebar (RTL-aware). Mobile: bottom tab bar.
- Slim header: logo + avatar/auth only. Account only in the avatar menu. No secondary top strip.
- Home leads with `SessionQuickPick`; taste identity (radar, retake, rating progress) lives behind a disclosure.
- Onboarding success navigates to `/recommendations`.
- Avatar menu: Account + Sign out only; account tabs stay in the `/account` shell.
- Recommendations empty/adjust CTAs point at Home’s session hero, not vague “dashboard” framing.

Preserve the chalkboard visual system. Do not reopen menu scan or venue flows.

## Research

### Jobs to be done (signed-in solo)

| Job | Destination | Priority |
| --- | --- | --- |
| Start tonight’s session and get picks | Home → Picks | Primary |
| Revisit current / cached picks | Picks | Primary |
| Teach the profile by rating | Rate (and inline on cards) | Secondary |
| Manage account / settings | Me | Tertiary |
| Inspect taste identity | Home disclosure | Tertiary |

**North-star metric:** time from app open (signed-in, profile exists) to seeing recommendation cards.

### Competitive IA

| Product | Pattern | Takeaway for Beerolog |
| --- | --- | --- |
| Vivino | Slimmed bottom bar to ~3 primary actions (Home, Camera/scan, Profile); secondary categories in dropdowns | Keep primary nav short; put identity in Me, not competing with action |
| Untappd | Discover / rate / social hub with persistent mobile destinations | Rating is a peer destination, not the only chrome CTA |
| Mobile IA practice | Bottom tabs for 3–5 peer destinations; drawer for overflow | Four destinations fit tab-bar guidance; avoid hamburger for core loop |

**Decision:** lock **bottom tabs on all breakpoints**, with a logo+auth header only. Putting four destination links in the header duplicated chrome and felt cluttered; tabs stay the single primary nav surface.

### Heuristic audit (current)

| Heuristic | Finding |
| --- | --- |
| Visibility of system status | No persistent “you are in Picks”; users must recall how they got there |
| Recognition over recall | Recommendations only reachable after session form on Home |
| Aesthetic and minimalist design | Home overloads the first viewport with secondary taste UI |
| Consistency | Account tabs duplicated in avatar menu and account shell |

## User Stories

1. As a signed-in user on a phone, I want a bottom tab bar with Home, Picks, Rate, and Me, so that I can jump between core jobs in one tap.
2. As a signed-in user on desktop, I want the same four destinations in the bottom tab bar, so that wayfinding matches mobile without a crowded header.
3. As a signed-in user, I want the header to stay logo + account only, so that Rate and Picks do not compete for top chrome.
4. As a signed-in user with a taste profile, I want Home’s first content to be tonight’s session quick-pick, so that I can get picks without scrolling past a radar chart.
5. As a signed-in user, I want a compact taste strip with persona and flavor badges, so that I still recognize my identity without a full museum layout.
6. As a signed-in user, I want taste details (radar, rating progress, retake quiz) behind an explicit disclosure, so that secondary depth stays available without cluttering the first viewport.
7. As a signed-in user who finished onboarding, I want to land on recommendations immediately, so that the quiz payoff is picks, not another dashboard stop.
8. As a signed-in user on Picks with no cached results, I want a clear CTA to start tonight’s picks on Home, so that I know how to recover.
9. As a signed-in user viewing picks, I want an optional way to adjust tonight’s session on Home, so that I can change vibe/ABV without hunting.
10. As a signed-in user opening the avatar menu, I want a single Account entry plus Sign out, so that I am not shown three account tabs twice.
11. As a signed-in user on `/account`, I want Profile / Security / Settings tabs in the account shell, so that account navigation stays local to that surface.
12. As a signed-out visitor, I want the sparse sign-in/sign-up header unchanged, so that marketing entry is not forced into app chrome.
13. As a Hebrew (RTL) signed-in user, I want tab labels and layout to mirror correctly with safe-area insets, so that the bar remains usable on notched phones.
14. As a signed-in user without a baseline taste yet, I want Home to stay quiz-first and Picks to recover safely (empty CTA or redirect toward onboarding/home), so that missing profile does not soft-lock the app.
15. As a maintainer, I want menu scan and venue QR kept out of this chrome, so that deferred surfaces do not re-enter through nav redesign.
16. As a reviewer, I want this redesign to supersede “profile-as-home” framing from profile-history polish where they conflict, so that picks-first is the authoritative home job for launch.

## Implementation Decisions

- ADR 0001 remains the scope boundary. No venue, menu-scan, group, or social chrome.
- Primary nav destinations (labels via i18n): Home → `/`, Picks → `/recommendations`, Rate → `/rate`, Me → `/account/profile`.
- Signed-in: bottom tab bar at all breakpoints with `env(safe-area-inset-bottom)` and main content bottom padding so content is not obscured.
- Header is logo + avatar/auth only; no primary destination links in the header.
- Avatar menu items: Account (`/account/profile`) and Sign out only.
- `TasteProfileSummary` order: greeting → SessionQuickPick → compact taste strip → disclosure for radar / rating progress / retake.
- Onboarding success navigation target: `/recommendations` (baseline picks path).
- Recommendations empty / back CTAs: prefer “Start tonight’s picks” → `/`; optional “Adjust tonight” when picks exist.
- Reconcile `CONTEXT.md` MVP bullet that still lists menu photo scan as in-scope so it matches ADR 0001 (doc-only follow-on within this work).
- Deep module opportunity: a small `signedInNav` config (destinations + active-match helpers) consumed by the bottom tab bar so labels/routes stay single-sourced.
- No API or schema changes.

## Testing Decisions

- Prefer behavior tests through public UI: rendered destinations, section order on home, onboarding navigate target, avatar menu items.
- Test modules: signed-in nav chrome, `TasteProfileSummary` (or home integration), onboarding success path, `UserMenu`.
- Prior art: existing route component tests that stub `createFileRoute` / Clerk `Show`, and hydration tests under `apps/web/src/routes/`.
- Do not assert CSS class strings as the primary contract; assert roles, links, headings, and user-visible order where practical.

## Out of Scope

- Menu scan, venue QR, managed tap lists, operator tooling
- Rebrand / new design system (chalkboard tokens stay)
- Beer history surface build-out from profile-history polish (beyond disclosure placement)
- Changing recommendation ranking, session intent schema, or rating taxonomy
- Bottom tabs for signed-out visitors

## Further Notes

- Parent plan: Nav + Dashboard Redesign (Get Picks Fast).
- Related PRDs: `quiz-polish.md` (handoff to recommendations), `profile-history-polish.md` (profile-as-home — superseded for primary job), `results-polish.md` (picks as payoff).
- Type: enhancement. Intended planning status: ready for execution slices.
