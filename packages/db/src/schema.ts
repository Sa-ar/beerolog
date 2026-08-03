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

// Proof strength for a Catch (ADR 0011). Only `self_photo` is written in v1;
// `venue_verified` is the reserved white-label seam, defined now, unused.
export const proofSourceEnum = pgEnum('proof_source', ['self_photo', 'venue_verified'])

// Post-serve "was it right?" outcome (white-label B4, #350). Closes the matching
// loop + grounds the return-rate KPI (C1).
export const ratingOutcomeEnum = pgEnum('rating_outcome', [
  'as_expected',
  'not_what_expected',
  'better_than_expected',
])

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

// Ordering opt-in per venue (white-label B2, #347). Declared before `venues`
// because pgEnum is evaluated eagerly at column definition.
export const orderingModeEnum = pgEnum('ordering_mode', ['off', 'native', 'integrated'])

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
    // White-label tenancy (staff portal, #297). Nullable so curated/unmanaged
    // venues keep working; a "managed" venue is one with org_id set. slug is the
    // QR-addressable handle (only managed venues need one); is_active is the
    // operator kill-switch.
    orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'set null' }),
    slug: text('slug'),
    isActive: boolean('is_active').notNull().default(true),
    // Ordering is opt-in per venue (white-label B2, #347).
    orderingMode: orderingModeEnum('ordering_mode').notNull().default('off'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('venues_city_idx').on(t.city),
    index('venues_org_idx').on(t.orgId),
    uniqueIndex('venues_slug_uniq').on(t.slug),
  ],
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
    // A Rating with a proof photo is a Catch (issue #330, ADR 0011). Nullable:
    // photo-less ratings stay plain ratings.
    proofPhotoUrl: text('proof_photo_url'),
    proofSource: proofSourceEnum('proof_source'),
    // Outcome signal (#350): attributed to the venue, and (later) the order that
    // triggered the prompt. order_id has no FK yet — the orders table is B2 (#347).
    outcome: ratingOutcomeEnum('outcome'),
    outcomeVenueId: text('outcome_venue_id').references(() => venues.id, { onDelete: 'set null' }),
    orderId: text('order_id'),
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

// ---------------------------------------------------------------------------
// White-label tenancy: markets, organizations, staff, invites, venue menus.
// Staff Portal slice #297 (docs/prds/staff-portal.md, ADR 0009/0010).
// Organizations ARE the tenants (ADR 0009 addendum); venues belong to an org
// via venues.org_id. These tables have no consumers yet — this slice lands the
// schema + migration only, as the foundation the portal + white-label slices
// build on.
// ---------------------------------------------------------------------------

export const orgStatusEnum = pgEnum('org_status', ['pending', 'active', 'suspended'])

export const staffRoleEnum = pgEnum('staff_role', ['org_owner', 'venue_manager', 'bartender'])

export const menuItemStatusEnum = pgEnum('menu_item_status', ['on', 'off'])

// A market scopes an organization to a country's config (locale, age gate).
export const markets = pgTable('markets', {
  id: text('id').primaryKey(), // e.g. 'IL'
  countryCode: text('country_code').notNull(),
  name: text('name').notNull(),
  defaultLocale: text('default_locale').notNull(),
  ageGateMinAge: integer('age_gate_min_age').notNull(),
  supportedLocales: text('supported_locales').array().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// The white-label tenant. Branding + market live here (ADR 0009 unification:
// organizations replace the separate white_label_tenants table).
export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    marketId: text('market_id')
      .notNull()
      .references(() => markets.id),
    brandingConfig: jsonb('branding_config'),
    status: orgStatusEnum('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('organizations_slug_uniq').on(t.slug)],
)

// Portal staff, backed by the staff Clerk instance (separate issuer from the
// consumer app). clerk_user_id is null until the invite is accepted.
export const staffMembers = pgTable(
  'staff_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    clerkUserId: text('clerk_user_id'),
    email: text('email').notNull(),
    displayName: text('display_name'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('staff_members_org_idx').on(t.orgId),
    uniqueIndex('staff_members_org_email_uniq').on(t.orgId, t.email),
  ],
)

// Per-venue role assignment (a staff member can hold roles at several venues).
export const staffVenueRoles = pgTable(
  'staff_venue_roles',
  {
    staffMemberId: uuid('staff_member_id')
      .notNull()
      .references(() => staffMembers.id, { onDelete: 'cascade' }),
    venueId: text('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    role: staffRoleEnum('role').notNull(),
  },
  (t) => [primaryKey({ columns: [t.staffMemberId, t.venueId] })],
)

// Discord-style per-capability grants/denies layered on role defaults.
// venue_id null = org-wide override.
export const staffPermissionOverrides = pgTable(
  'staff_permission_overrides',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    staffMemberId: uuid('staff_member_id')
      .notNull()
      .references(() => staffMembers.id, { onDelete: 'cascade' }),
    venueId: text('venue_id').references(() => venues.id, { onDelete: 'cascade' }),
    capability: text('capability').notNull(),
    granted: boolean('granted').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('staff_permission_overrides_member_idx').on(t.staffMemberId)],
)

// Single-use, expiring email invites. Role + venue are locked at invite time.
export const staffInvites = pgTable(
  'staff_invites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    venueId: text('venue_id').references(() => venues.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: staffRoleEnum('role').notNull(),
    token: text('token').notNull(),
    invitedBy: uuid('invited_by').references(() => staffMembers.id, { onDelete: 'set null' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('staff_invites_token_uniq').on(t.token)],
)

// A venue's managed tap list. References canonical beers (no per-venue copies).
export const venueMenuItems = pgTable(
  'venue_menu_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    venueId: text('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    beerId: text('beer_id')
      .notNull()
      .references(() => beers.id, { onDelete: 'cascade' }),
    status: menuItemStatusEnum('status').notNull().default('on'),
    servingFormat: text('serving_format'),
    priceIls: integer('price_ils'),
    position: integer('position'),
    addedBy: uuid('added_by').references(() => staffMembers.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('venue_menu_items_venue_beer_uniq').on(t.venueId, t.beerId),
    index('venue_menu_items_venue_idx').on(t.venueId),
  ],
)

// Catalog gaps: a beer a venue wants that isn't in the shared catalog yet.
// Staff submit a name; an LLM pre-fills a draft; a catalog.submit holder confirms.
// The row is queued (status=pending) for operator review before it becomes a
// canonical `beers` record — so a gap is NOT yet a venue_menu_items entry (those
// reference canonical beers only). See docs/prds/staff-portal.md menu/catalog flow.
export const catalogGapStatusEnum = pgEnum('catalog_gap_status', [
  'pending',
  'approved',
  'rejected',
])

export const catalogGaps = pgTable(
  'catalog_gaps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    venueId: text('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    submittedBy: uuid('submitted_by').references(() => staffMembers.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    brewery: text('brewery'),
    style: text('style'),
    abv: real('abv'),
    ibu: integer('ibu'),
    tastingNotes: text('tasting_notes'),
    flavorVector: real('flavor_vector').array(),
    status: catalogGapStatusEnum('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('catalog_gaps_status_idx').on(t.status),
    index('catalog_gaps_venue_idx').on(t.venueId),
  ],
)

// In-venue consumer visit log (white-label B1, #346). Written when a guest or
// signed-in user lands on /v/$venueSlug via QR/link; funnel + area attribution.
export const visitSourceEnum = pgEnum('visit_source', ['qr', 'link'])

export const venueVisits = pgTable(
  'venue_visits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    venueId: text('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    sessionToken: text('session_token'),
    source: visitSourceEnum('source').notNull().default('qr'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('venue_visits_venue_idx').on(t.venueId, t.createdAt)],
)

// In-venue ordering (white-label B2, #347).
export const orderStatusEnum = pgEnum('order_status', [
  'placed',
  'acked',
  'in_progress',
  'served',
  'cancelled',
])

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    venueId: text('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    sessionToken: text('session_token'),
    tableLabel: text('table_label'),
    status: orderStatusEnum('status').notNull().default('placed'),
    totalIls: integer('total_ils'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('orders_venue_status_idx').on(t.venueId, t.status, t.createdAt)],
)

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    beerId: text('beer_id')
      .notNull()
      .references(() => beers.id, { onDelete: 'cascade' }),
    qty: integer('qty').notNull().default(1),
    priceIlsSnapshot: integer('price_ils_snapshot'),
  },
  (t) => [index('order_items_order_idx').on(t.orderId)],
)
