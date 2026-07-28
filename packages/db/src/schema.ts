/**
 * Pivot schema (slice #74). See docs/prds/taste-profile-matcher.md.
 *
 * - `beers`: one row per recipe; carries the 1536-D BeerEmbedding.
 * - `user_baseline_taste`: persisted, slowly-evolving taste profile.
 * - `beer_ratings`: 3-state taste feedback (loved/fine/disliked). See
 *   docs/prds/beer-rating-feedback.md — reverses the 0001 integer pivot.
 *
 * pgvector extension must be enabled — see migrations/0001_pivot_taste_profile_matcher.sql.
 */
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  real,
  integer,
  jsonb,
  timestamp,
  boolean,
  index,
  uniqueIndex,
  primaryKey,
  customType,
} from 'drizzle-orm/pg-core'

// drizzle-orm 0.36 ships pgvector via a custom type helper. We declare it
// inline so consumers don't need a separate extension package.
const vector = (name: string, opts: { dimensions: number }) =>
  customType<{ data: number[]; driverData: string }>({
    dataType() {
      return `vector(${opts.dimensions})`
    },
    toDriver(value: number[]) {
      return `[${value.join(',')}]`
    },
    fromDriver(value: string) {
      return JSON.parse(value) as number[]
    },
  })(name)

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const marketTierEnum = pgEnum('market_tier', ['mainstream', 'craft', 'import'])

export const beerColorEnum = pgEnum('beer_color', ['pale', 'gold', 'amber', 'brown', 'dark'])

export const beerBodyEnum = pgEnum('beer_body', ['light', 'medium', 'full'])

export const beerSweetnessEnum = pgEnum('beer_sweetness', ['dry', 'balanced', 'sweet'])

export const notesLangEnum = pgEnum('notes_lang', ['he', 'en'])

export const notesSourceEnum = pgEnum('notes_source', ['brewery', 'aggregator', 'synthetic'])

export const ratingEnum = pgEnum('rating', ['loved', 'fine', 'disliked', 'unknown'])

export const venueTypeEnum = pgEnum('venue_type', ['shop', 'pub'])

// 'curated' rows come from our seed; 'user' rows come from crowdsourced reports.
export const availabilitySourceEnum = pgEnum('availability_source', ['curated', 'user'])


// ---------------------------------------------------------------------------
// Users (Clerk-backed; matches the foundation auth wiring)
// ---------------------------------------------------------------------------

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email'),
  displayName: text('display_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------------------------------------------------------------------------
// BaselineTaste (persisted, per user)
// ---------------------------------------------------------------------------

export const userBaselineTaste = pgTable('user_baseline_taste', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  bubbles: real('bubbles').notNull(),
  bitterness: real('bitterness').notNull(),
  // New first-class dials (ADR-0005); default 0.5 so existing rows backfill neutral.
  sweetness: real('sweetness').notNull().default(0.5),
  body: real('body').notNull().default(0.5),
  abvAffinity: real('abv_affinity').notNull().default(0.5),
  // flavorFamily is a {malty,hoppy,roasty,fruity,sour,smoky: 0..1} object
  flavorFamily: jsonb('flavor_family').notNull(),
  noveltyAffinity: real('novelty_affinity').notNull(),
  // Profiles below the current model version are treated as stale (forced re-quiz).
  modelVersion: integer('model_version').notNull().default(0),
  // LLM persona, persisted per language; populated at onboarding (slice #126).
  personaTitleEn: text('persona_title_en'),
  personaTitleHe: text('persona_title_he'),
  personaBlurbEn: text('persona_blurb_en'),
  personaBlurbHe: text('persona_blurb_he'),
  embedding: vector('embedding', { dimensions: 1536 }).notNull(),
  embeddingFreshAt: timestamp('embedding_fresh_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------------------------------------------------------------------------
// Beers (the catalog the matcher ranks against)
// ---------------------------------------------------------------------------

export const beers = pgTable(
  'beers',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    nameHebrew: text('name_hebrew'),
    brewery: text('brewery').notNull(),
    breweryCountry: text('brewery_country').notNull(),
    style: text('style').notNull(),
    abv: real('abv').notNull(),
    ibu: integer('ibu'),
    hops: text('hops').array(),
    malts: text('malts').array(),
    yeast: text('yeast'),
    color: beerColorEnum('color').notNull(),
    body: beerBodyEnum('body'),
    sweetness: beerSweetnessEnum('sweetness'),
    marketTier: marketTierEnum('market_tier').notNull(),
    tastingNotes: text('tasting_notes').notNull(),
    tastingNotesLang: notesLangEnum('tasting_notes_lang').notNull(),
    notesSource: notesSourceEnum('notes_source').notNull(),
    adventurousness: real('adventurousness').notNull(),
    embedding: vector('embedding', { dimensions: 1536 }).notNull(),
    imageUrl: text('image_url'),
    sourceUrl: text('source_url'),
    seededAt: timestamp('seeded_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('beers_market_tier_idx').on(t.marketTier),
    index('beers_style_idx').on(t.style),
  ],
)

// ---------------------------------------------------------------------------
// Icons (generated SVG assets, reused by canonical purpose)
// ---------------------------------------------------------------------------

export const icons = pgTable(
  'icons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    purpose: text('purpose').notNull(),
    description: text('description').notNull(),
    svgContent: text('svg_content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('icons_purpose_uniq').on(t.purpose)],
)

// ---------------------------------------------------------------------------
// Venues + availability ("where can I buy this beer")
//
// venues: liquor shops & pubs, located by free-text city/area (no geocoding).
// beer_availability: which beers each venue stocks. last_verified_at is the
// freshness signal user reports will bump in a later slice.
// ---------------------------------------------------------------------------

export const venues = pgTable(
  'venues',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    nameHebrew: text('name_hebrew'),
    type: venueTypeEnum('type').notNull(),
    city: text('city').notNull(),
    area: text('area'),
    address: text('address'),
    url: text('url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('venues_city_idx').on(t.city)],
)

export const beerAvailability = pgTable(
  'beer_availability',
  {
    beerId: text('beer_id')
      .notNull()
      .references(() => beers.id, { onDelete: 'cascade' }),
    venueId: text('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    source: availabilitySourceEnum('source').notNull().default('curated'),
    lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.beerId, t.venueId] }),
    index('beer_availability_beer_idx').on(t.beerId),
  ],
)

export const availabilityKindEnum = pgEnum('availability_kind', [
  'scrape_seen',
  'scrape_absent',
  'user_confirm',
  'user_deny',
  'user_add',
])

// Append-only signal log (ADR-0006). Confidence is recomputed from these rows,
// never stored as a flag. Rows are only inserted, never updated.
export const availabilitySignal = pgTable(
  'availability_signal',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    beerId: text('beer_id')
      .notNull()
      .references(() => beers.id, { onDelete: 'cascade' }),
    venueId: text('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    kind: availabilityKindEnum('kind').notNull(),
    // Magnitude, already trust-weighted at write time; sign comes from kind.
    weight: real('weight').notNull(),
    actor: text('actor').notNull(), // 'scrape:<source>' | 'user:<id>'
    sourceUrl: text('source_url'),
    observedAt: timestamp('observed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('availability_signal_pair_idx').on(t.beerId, t.venueId)],
)

// Materialized read cache: confidence recomputed from the signal log.
export const availabilityConfidence = pgTable(
  'availability_confidence',
  {
    beerId: text('beer_id')
      .notNull()
      .references(() => beers.id, { onDelete: 'cascade' }),
    venueId: text('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    confidence: real('confidence').notNull(),
    lastConfirmedAt: timestamp('last_confirmed_at', { withTimezone: true }),
    recomputedAt: timestamp('recomputed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.beerId, t.venueId] }),
    index('availability_confidence_beer_idx').on(t.beerId),
  ],
)

// User flags on a (beer, venue) pairing; enough unresolved flags hide it from
// reads until an operator reviews (slice #166).
export const availabilityFlag = pgTable(
  'availability_flag',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    beerId: text('beer_id')
      .notNull()
      .references(() => beers.id, { onDelete: 'cascade' }),
    venueId: text('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    reporter: text('reporter').notNull(), // 'user:<id>'
    reason: text('reason'),
    resolved: boolean('resolved').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  // Unique per (pair, reporter): one effective flag per user, so a single user
  // can't cross the hide threshold by flagging repeatedly. The (beerId, venueId)
  // prefix still serves the read-path distinct-reporter count.
  (t) => [uniqueIndex('availability_flag_pair_reporter_uniq').on(t.beerId, t.venueId, t.reporter)],
)

// Ambiguous scrape→catalog matches (0.80–0.92) awaiting human judgment (slice #161/#166).
export const availabilityMatchReview = pgTable(
  'availability_match_review',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    venueId: text('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    beerId: text('beer_id')
      .notNull()
      .references(() => beers.id, { onDelete: 'cascade' }),
    score: real('score').notNull(),
    resolved: boolean('resolved').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('availability_match_review_open_idx').on(t.resolved)],
)

// ---------------------------------------------------------------------------
// Ratings (integer 1–5)
// ---------------------------------------------------------------------------

export const beerRatings = pgTable(
  'beer_ratings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    beerId: text('beer_id')
      .notNull()
      .references(() => beers.id, { onDelete: 'cascade' }),
    rating: ratingEnum('rating').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('beer_ratings_user_idx').on(t.userId),
    index('beer_ratings_beer_idx').on(t.beerId),
    uniqueIndex('beer_ratings_user_beer_uniq').on(t.userId, t.beerId),
  ],
)

// ---------------------------------------------------------------------------
// Want-to-try list (slice #325) — right-swipe / super-like on `What I want`.
// `want` = right-swipe, `must_try` = super-like (pinned to the top of the list).
// ---------------------------------------------------------------------------

export const wantToTryStateEnum = pgEnum('want_to_try_state', ['want', 'must_try'])

export const wantToTry = pgTable(
  'want_to_try',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    beerId: text('beer_id')
      .notNull()
      .references(() => beers.id, { onDelete: 'cascade' }),
    state: wantToTryStateEnum('state').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('want_to_try_user_idx').on(t.userId),
    uniqueIndex('want_to_try_user_beer_uniq').on(t.userId, t.beerId),
  ],
)

// Persistent cache of onboarding-questionnaire embeddings for the public guest
// flow. The initial questionnaire has a finite answer space, so once each combo
// has been embedded once it is read from here forever — OpenAI is never called
// again for a known combo, across workers and restarts. Keyed by a hash of the
// canonical synthetic preference text (baseline_taste.compose_text).
export const guestEmbeddingCache = pgTable('guest_embedding_cache', {
  promptHash: text('prompt_hash').primaryKey(),
  embedding: vector('embedding', { dimensions: 1536 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// Pseudonymous record of free (signed-out) questionnaire submissions, tagged at
// the source. No per-person identifier is in the row — just the answers and which
// beers we showed — but edge/hosting logs hold IP + request time, so a row is
// correlatable to a person (pseudonymous, not anonymous). Captures the aggregate
// answer distribution for quiz validation. Lower signal than registered users
// (guests leave no ratings), but still useful for A/B-ing hypothesis questions.
export const guestSubmissions = pgTable('guest_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  answers: jsonb('answers').notNull(),
  shownBeerIds: text('shown_beer_ids').array().notNull(),
  source: text('source').notNull().default('free'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
