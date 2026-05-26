# Architecture

## FlavorVector contract

The FlavorVector is the core data type. It represents a user's (or beer's) taste profile as 7 floating-point dimensions, all in `[0, 1]`.

| Index | Dimension | Low end | High end |
|---|---|---|---|
| 0 | `bitterness` | None | Very bitter |
| 1 | `sweetness` | Dry | Very sweet |
| 2 | `fruitiness` | None | Very fruity/citrusy |
| 3 | `roast` | None | Strong coffee/chocolate |
| 4 | `sourness` | None | Very tart/sour |
| 5 | `body` | Light/thin | Full/rich |
| 6 | `adventure` | Safe/familiar | Adventurous/unusual |

**Canonical order is fixed.** Both the API (`app/models/flavor.py`) and the TypeScript package (`packages/types`) define this order. DB columns store the vector as a `real[]` in this order.

**Schema version**: `FLAVOR_VECTOR_SCHEMA_VERSION = 1`. Any add, remove, or reorder of dimensions is a breaking change. To make one:
1. Bump `FLAVOR_VECTOR_SCHEMA_VERSION` in both `packages/types` and `app/models/flavor.py`
2. Write and run a migration job that re-embeds all rows in `user_profiles` and `beers` where `schema_version < new_version`

---

## Deferred surfaces

Venue/scan and group/challenge remain deferred after cleanup. The related services, tables, and token utilities below are documented as follow-on work, not as part of the supported MVP runtime surface.

## Service modules

All services live in `apps/api/app/services/`. Each is a pure module: no global state, dependencies injected as arguments.

| Module | Responsibility |
|---|---|
| `recommendation_service` | Scores beers against a flavor vector; returns best, backup, and adventurous slots |
| `explanation_service` | Calls GPT-4o to generate one-sentence explanations for recommended beers |
| `feedback_service` | Applies a rating (loved/fine/disliked) to nudge a user’s flavor vector; tracks style suppressions |
| `persona_service` | Classifies a flavor vector into one of 10 personas via cosine similarity to centroid vectors |
| `user_profile_service` | Persists and retrieves user flavor vectors and beer history |
| `menu_scanner` | Deferred venue/scan helper: accepts a base64 image, calls GPT-4o to extract beer names, fuzzy-matches against catalog |
| `fuzzy_matcher` | Levenshtein-based name matching against a beer catalog; threshold 0.6 |
| `qr_token` | Deferred venue/scan helper: generates and decodes HS256 JWTs encoding a venue ID; 24h TTL |
| `group_session` | Deferred group surface: manages group quiz sessions, aggregation, and recommendation handoff |
| `challenge_service` | Deferred challenge surface: generates and resolves friend-challenge tokens and compares two flavor vectors |
| `badge_engine` | Pure functions: checks milestone badges for bar exploration, expert recommendations, taste evolution |
| `social_proof` | Deferred venue-facing social proof: counts friends who positively rated a beer at a venue |
| `leaderboard` | Deferred venue-facing leaderboard: ranks users by positive recommendation count at a venue; respects privacy flags |

---

## In-memory repo pattern

Every service that needs persistence uses a `Protocol`-typed repository interface. For testing, an `InMemory*Repo` implementing that protocol is injected via FastAPI’s `dependency_overrides`. Production repos (not yet implemented) will use asyncpg against Neon.

This means:
- Tests never touch a database
- Services are fully testable in isolation
- Adding a real DB repo later is a drop-in: implement the Protocol, wire up the dependency

```
Service function(repo: SomeRepo) → business logic
                ┘ InMemorySomeRepo (tests)
                ┘ PgSomeRepo (production — not yet implemented)
```

---

## Database schema

Managed with Drizzle ORM in `packages/db/src/schema.ts`. Run `pnpm db:generate && pnpm db:migrate` after any schema change.

| Table | Key columns | Notes |
|---|---|---|
| `users` | `id`, `cognito_sub`, `email`, `display_name` | One row per Cognito user; `cognito_sub` is the JWT `sub` claim |
| `user_profiles` | `user_id`, `flavor_vector real[]`, `embedding vector(1536)`, `schema_version`, `persona_id`, `ratings_visible_to_friends` | Taste profile; HNSW index on `embedding` |
| `beers` | `id`, `name`, `brewery`, `style`, `abv`, `flavor_vector real[]`, `embedding vector(1536)` | Beer catalog; HNSW index on `embedding` |
| `venues` | `id`, `name`, `address`, `qr_code_token` | `qr_code_token` is the signed JWT used in QR codes |
| `venue_tap_list` | `venue_id`, `beer_id`, `active`, `added_at`, `removed_at` | Active tap list items; filtered by `active = true` |
| `beer_ratings` | `user_id`, `beer_id`, `venue_id`, `rating` | `rating` enum: `loved`, `fine`, `disliked`; `venue_id` nullable (rated outside a venue) |
| `group_sessions` | `id`, `host_user_id`, `venue_id`, `status`, `expires_at` | Deferred table for group-session state; status: `open`, `completed`, `expired`; 4-hour TTL |
| `group_participants` | `session_id`, `user_id`, `display_name`, `flavor_vector real[]` | Deferred table for group-session participants; `user_id` nullable for anonymous guests |
| `friendships` | `user_id`, `friend_id` | Directed edge; to check mutual friendship query both directions |

pgvector HNSW indexes use `vector_cosine_ops` for approximate nearest-neighbor search.

---

## Key flows

### Deferred QR scan flow

This flow is intentionally deferred from the supported MVP. The related modules remain in the repo as future work, but the public routes are not mounted in the current application surface.

1. Venue manager generates a QR code: API signs a JWT encoding `venue_id` with `API_SECRET` (24h TTL)
2. Customer scans the QR code; browser would hit `GET /scan/{token}`
3. API decodes and validates the JWT, returns the venue’s active tap list
4. Frontend would show beers on tap and let the customer run a filtered quiz

### Deferred group session flow

This flow is intentionally deferred from the supported MVP. The supporting services and tables remain in the repo as future work, but the public routes are not mounted in the current application surface.

1. Host creates a session: `POST /sessions` → session ID + 4h expiry
2. Host shares session link; participants would `POST /sessions/{id}/join` with a display name
3. Each participant would take the quiz and `POST /sessions/{id}/submit` with their flavor vector
4. When enough participants have submitted, a client would hit `GET /sessions/{id}/recommend`
5. API aggregates vectors (per-dimension mean with variance check), runs recommendation, and returns results
6. If variance is high across any dimension, the response includes `group_variance_high: true`

### Taste feedback nudge

When a user rates a beer, `feedback_service.apply_rating` updates their flavor vector:

- **loved**: nudge vector toward the beer’s vector (`new = current + 0.1 * (beer - current)`)
- **fine**: no vector change
- **disliked**: nudge vector away from the beer’s vector; add beer’s style to suppression list for 5 ratings

All dimensions are clamped to `[0, 1]` after nudge.

### Persona classification

10 personas each have a hand-tuned centroid vector (7 dimensions). `persona_service.classify_persona` computes cosine similarity between the user’s flavor vector and each centroid, returning the closest persona. Classification is stateless — run it any time from the current profile vector.
