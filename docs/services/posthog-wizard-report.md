# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the Beerolog TanStack Start web application. The existing opt-in consent gate and `posthog-js` setup in `analytics.ts` were preserved and extended: new typed event definitions were added to `EventProps`, a `ui_host` was wired up, and `identifyUser`/`resetAnalyticsUser` helpers with deferred-init support were added. A new `PostHogIdentitySync` component bridges Clerk's auth state to PostHog identity on every page load. Eight new event captures were instrumented across five files covering the full signed-in user journey.

| Event | Description | File |
|---|---|---|
| `session_started` | User submits a tonight's picks session with vibe and ABV preferences | `apps/web/src/components/SessionQuickPick.tsx` |
| `menu_scanned` | User scans a menu photo to get taste-fit ranked beer recommendations | `apps/web/src/routes/menu.tsx` |
| `recommendations_loaded` | Recommendations page successfully loads and displays beer picks | `apps/web/src/routes/recommendations.tsx` |
| `recommendations_shared` | User shares their top beer recommendation via native share or clipboard | `apps/web/src/routes/recommendations.tsx` |
| `recommendations_loaded_more` | User taps 'show more' to load additional beer recommendations | `apps/web/src/routes/recommendations.tsx` |
| `beer_rated` | User swipes to rate a beer in the deck rating flow | `apps/web/src/lib/rate-deck.ts` |
| `rating_session_complete` | User finishes rating all beers in a deck session | `apps/web/src/lib/rate-deck.ts` |
| `beer_detail_viewed` | User views the public detail page for a specific beer | `apps/web/src/routes/beer.$id.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics (wizard) — Dashboard](https://eu.posthog.com/project/232627/dashboard/850276)
- [Session start funnel](https://eu.posthog.com/project/232627/insights/WixqTJOv) — `session_started` → `recommendations_loaded` conversion
- [Beer ratings by sentiment](https://eu.posthog.com/project/232627/insights/sTUJgTW3) — `beer_rated` breakdown by rating value
- [Menu scan to beer detail funnel](https://eu.posthog.com/project/232627/insights/7deHApR0) — `menu_scanned` → `beer_detail_viewed`
- [Recommendations share method](https://eu.posthog.com/project/232627/insights/cICodpeA) — native vs clipboard shares
- [Rating session completion rate](https://eu.posthog.com/project/232627/insights/OrHpsvFu) — `rating_session_complete` vs `beer_rated` weekly

## Verify before merging

- [ ] Run a full production build (the wizard only verified the files it touched) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `VITE_POSTHOG_PROJECT_TOKEN` and `VITE_POSTHOG_HOST` to `.env.local.example` and any bootstrap scripts so collaborators know what to set.
- [ ] Wire source-map upload (`posthog-cli sourcemap` or your bundler's upload step) into CI so production stack traces de-minify in PostHog error tracking.
- [ ] Confirm the returning-visitor path also calls `identify` — `PostHogIdentitySync` fires on every mount inside `ClerkProvider`, so this should work, but verify in a real session that events on page refresh are linked to the user.
- [ ] This project has PostgreSQL (Neon), Clerk, and OpenAI data sources that PostHog can import. Run `npx @posthog/wizard warehouse` to connect them to PostHog's data warehouse.

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.
