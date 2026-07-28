# ADR 0011: Catch proof by presence, not photo content

Status: accepted

## Context

The `Catch` feature (a `Rating` finalized with `Proof`, and shareable) requires "proof of some kind". A photo cannot be reliably verified to show a real, freshly-poured beer — a photo-of-a-photo defeats content verification, and chasing airtight photo verification is an unwinnable arms race with no payoff on the B2C demo shell.

## Decision

Proof is a user-submitted photo accepted on the **honor system** in v1 (`ProofSource: self_photo`): the presence of a photo is required, its content is not verified. We verify *presence*, not the photo, and model proof strength as a `ProofSource` discriminator rather than a boolean. `venue_verified` (a venue-issued presence signal such as a QR or receipt code) is reserved as a seam for white-label but **not built now**. Verification strictness scales with context: on the B2C demo it does not matter; under white-label the tenant issues the presence signal, attaches any reward, and therefore owns the fraud risk and sets the strictness. Same seam-now-build-later philosophy as ADR 0009.

## Consequences

- The DB carries a nullable `ProofSource` discriminator from day one so white-label can add stronger tiers without a schema rewrite.
- No vision/content verification is built. A determined B2C user can submit a fake photo — accepted, because the B2C app is a demo shell and the shared artifact, not fraud prevention, is the point.
- `Catch` reuses the existing `beer_ratings` model (a Catch is a Rating plus proof), and the shareable images reuse the existing `@vercel/og` archetype pipeline.
- Deferred: the `venue_verified` QR/receipt tier, "top X%" percentile sharing (meaningless at small N), and the locked-silhouette completion board. "Catch 'em all" is scoped to a single defined `Set`.
