/**
 * Pivot schema (slice #74). See docs/prds/taste-profile-matcher.md.
 *
 * - `beers`: one row per recipe; carries the 1536-D BeerEmbedding.
 * - `user_baseline_taste`: persisted, slowly-evolving taste profile.
 * - `beer_ratings`: integer 1–5 score (replaces the prior loved/fine/disliked enum).
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
  index,
  uniqueIndex,
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
  // flavorFamily is a {malty,hoppy,roasty,fruity,sour,smoky: 0..1} object
  flavorFamily: jsonb('flavor_family').notNull(),
  noveltyAffinity: real('novelty_affinity').notNull(),
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
    rating: integer('rating').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('beer_ratings_user_idx').on(t.userId),
    index('beer_ratings_beer_idx').on(t.beerId),
    uniqueIndex('beer_ratings_user_beer_uniq').on(t.userId, t.beerId),
  ],
)
