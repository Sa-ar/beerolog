# PRD: Catalog Readiness

## Problem Statement

Beerolog now has a frozen launch boundary and a launch definition of done, but it does not yet define what makes the recommendation catalog itself launch-ready. Without that definition, catalog work can drift in two bad directions at once. The team can under-specify the catalog and ship a signed-in solo flow whose recommendations feel sparse, repetitive, or poorly explained. Or the team can over-correct and treat browse features, venue availability, or admin tooling as launch blockers even though they are outside the current MVP.

The missing catalog bar creates four concrete risks. First, the solo recommendation engine can only be as credible as the seeded beers and flavor vectors it receives. Second, the results and profile surfaces can degrade if recommended or rated beer IDs no longer resolve to stable metadata. Third, contributors can mistake "more beers" for "better launch readiness" without agreeing on what coverage and curation actually matter. Fourth, catalog planning can accidentally reopen deferred venue or operator surfaces that the launch boundary explicitly excluded.

## Solution

Define launch catalog readiness as a closed, curated solo recommendation catalog that is broad enough to support credible recommendations across the signed-in MVP, stable enough to preserve ratings and history, and rich enough to make the current results and profile screens readable.

This PRD treats the launch catalog as a curated product artifact, not an operational platform. Launch readiness is satisfied by maintaining one authoritative seed-backed catalog for the signed-in solo flow, with explicit expectations for style coverage, metadata completeness, flavor-vector quality, and stable beer identity. It does not require a live inventory system, a browseable public catalog, or an admin workflow for adding and editing beers.

## User Stories

1. As a signed-in solo user, I want recommendations drawn from a catalog with broad taste coverage, so that my results feel credible rather than generic.
2. As a signed-in solo user, I want each recommended beer to have recognizable identity and context, so that I can understand why it was shown to me.
3. As a returning user, I want beers I rated earlier to resolve back to readable history entries, so that my profile stays coherent over time.
4. As a product owner, I want catalog readiness defined in launch terms instead of "more content is always better," so that release scope stays focused.
5. As a maintainer, I want one authoritative catalog source for the solo MVP, so that the web catalog, recommendation payloads, and persisted beer IDs do not drift apart.
6. As a recommender owner, I want each beer to carry a credible `FlavorVector`, so that recommendation quality depends on curated taste data instead of placeholders.
7. As a content curator, I want launch curation to prioritize a balanced set of recognizable and distinctive beers, so that the catalog feels useful without becoming an endless ingestion project.
8. As a frontend developer, I want results cards to have enough beer metadata for the current UI, so that recommendations look intentional rather than unfinished.
9. As a frontend developer, I want profile history entries to map back to the same canonical beer records used during recommendation, so that past ratings remain understandable.
10. As a reviewer, I want explicit completeness rules for launch catalog coverage, so that catalog readiness can be checked objectively before release.
11. As a planner, I want venue and admin catalog work left out of this PRD, so that launch catalog readiness does not quietly expand into platform work.
12. As a QA owner, I want catalog verification to catch identity drift, missing metadata, and coverage gaps early, so that recommendation problems are found before launch.
13. As a future feature owner, I want this PRD to describe a launch catalog for the solo MVP only, so that later browse, venue, or management surfaces can be planned separately.

## Implementation Decisions

- ADR 0001 remains the authoritative product boundary for this PRD. Catalog readiness applies only to the signed-in solo MVP: quiz, recommendations, ratings/history, profile, and persona support.
- The launch catalog is a closed curated set, not an open-ended platform. Launch does not require user browse/search, venue-specific tap lists, menu scanning, admin tooling, or runtime catalog editing.
- The authoritative launch catalog source is the existing seed-backed solo catalog surfaced from the current beer seeds into the web recommendation payload shape and metadata lookup shape. Launch should preserve one canonical source of truth for beer identity across recommendation, rating, and history flows.
- Launch readiness does not require a massive long-tail catalog. A curated catalog on the order of the current seed set is sufficient if it remains balanced and high quality. The current launch baseline is 99 beers across 14 canonical styles: `amber_ale`, `brown_ale`, `dunkel`, `ipa`, `kolsch`, `lager`, `pale_ale`, `pilsner`, `porter`, `saison`, `sour`, `stout`, `vienna_lager`, and `wheat`.
- Catalog completeness for launch is defined by coverage, not by raw count alone. The catalog must continue to cover the major taste regions exercised by the current solo flow: crisp/light lagers and pilsners, fruity wheat beers, hop-forward pale ales and IPAs, malt-forward ambers and dark lagers, roast-forward porters and stouts, tart sours, and farmhouse-style saisons.
- No represented canonical style should drop below two launch-ready beers. The launch catalog should avoid singleton styles because the solo recommendation flow returns multiple ranked slots and benefits from having alternatives within each represented style family.
- Launch curation should include both approachable anchors and more distinctive beers across the supported taste space. The goal is not exhaustive market representation; it is enough breadth that the recommendation engine can make believable "best," "backup," and "more adventurous" picks for a wide range of user vectors.
- Every launch catalog entry must have a stable canonical beer ID that is safe to persist in ratings and history. Renaming or replacing entries in a way that breaks existing beer IDs is not launch-safe unless a deliberate migration plan preserves user history.
- Every launch catalog entry must include the minimum identity and recommendation data required by the current solo product: beer ID, name, brewery, canonical style, full 7-dimension `FlavorVector` in canonical order, and short-form metadata that keeps the results and profile surfaces readable.
- ABV and style tags are part of the current results experience and should remain populated for launch entries. Description text is curated product copy rather than a schema requirement, but launch curation should preserve readable descriptions for beers where extra context materially improves the current results screen.
- Catalog curation should prefer believable, human-readable beer records over synthetic placeholders. Flavor vectors, style labels, and tags should match the actual beer well enough that recommendation explanations and ratings feedback are not built on obviously misleading data.
- The catalog used during recommendation and the metadata used during profile/history rendering must stay aligned on the same canonical beer IDs. A launch-ready catalog cannot recommend beers that the history view later fails to resolve back into recognizable records.
- Launch readiness for the catalog does not require production database-backed catalog storage. A static curated seed-backed catalog is acceptable for launch as long as it remains authoritative and stable across the supported solo flow.
- Catalog work before launch should bias toward improving curation quality inside the current solo catalog: tightening flavor vectors, filling metadata gaps, removing weak or redundant entries, and preserving balanced style coverage. It should not expand into building operator workflows.

## Testing Decisions

- A good catalog-readiness test validates externally visible product behavior: the solo flow can recommend from a stable curated catalog, the current results UI has readable metadata to render, and persisted beer IDs remain understandable in user history.
- Automated verification should continue to treat stable catalog identity as a release concern. Prior art already exists in the contract check that ensures the web catalog uses seed-defined beer IDs.
- Automated verification for catalog readiness should also check that the launch catalog continues to satisfy the agreed coverage bar: all represented canonical styles still exist, no represented style falls below the minimum entry count, and every entry includes the required launch metadata fields.
- Recommendation verification should stay behavior-oriented. Tests should exercise representative taste vectors against the launch catalog and confirm that the recommendation flow still produces valid ranked slots from the curated seed set.
- Profile/history verification should confirm that persisted `beer_id` values can still resolve back to launch catalog metadata used by the current profile experience.
- Manual review should sample the current results surface and confirm that recommended beers render with readable identity and supporting metadata, especially for very different taste regions such as crisp lager, juicy IPA, stout, and sour recommendations.
- Catalog tests should validate durable data contracts, not overfit the internal scoring algorithm. The important launch question is whether the catalog supports the current solo product coherently, not whether one exact ranking implementation detail remains unchanged.

## Out of Scope

- Building a venue-specific, location-aware, or inventory-aware beer catalog
- Treating menu scanning, QR flows, tap lists, or broader venue tooling as part of launch catalog readiness
- Building an admin console, moderation workflow, import pipeline, or merge/deduplication platform for catalog operations
- Adding a browseable public beer catalog outside the current signed-in solo recommendation flow
- Requiring images, pricing, distributor data, availability by market, or other commerce-oriented metadata
- Reopening the launch boundary beyond the signed-in solo MVP
- Defining post-launch catalog expansion strategy for venue, community, or operator surfaces

## Further Notes

This PRD intentionally defines catalog readiness in the narrowest form that still makes the supported Beerolog MVP feel real at launch. The catalog is product content for the current solo flow, not a standalone platform investment.

If Beerolog later decides to support live tap lists, public beer exploration, or operator-managed catalog workflows, that work should start from a new PRD rather than being smuggled into launch-readiness expectations for the current seed-backed solo catalog.
