import {
  pgTable,
  pgEnum,
  uuid,
  text,
  real,
  integer,
  boolean,
  timestamp,
  index,
  customType,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { FLAVOR_VECTOR_DIMENSIONS, FLAVOR_VECTOR_SCHEMA_VERSION } from '@beerolog/types'

// ---------------------------------------------------------------------------
// pgvector custom type (1536-dim for text-embedding-3-small)
// ---------------------------------------------------------------------------

const vector1536 = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)'
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`
  },
  fromDriver(value: string): number[] {
    return value.slice(1, -1).split(',').map(Number)
  },
})

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const ratingEnum = pgEnum('rating', ['loved', 'fine', 'disliked'])
export const beerStyleEnum = pgEnum('beer_style', [
  'lager', 'pilsner', 'kolsch', 'wheat', 'pale_ale', 'ipa',
  'amber_ale', 'brown_ale', 'stout', 'porter', 'sour',
  'saison', 'dunkel', 'vienna_lager', 'other',
])
export const groupSessionStatusEnum = pgEnum('group_session_status', [
  'open', 'completed', 'expired',
])
export const personaEnum = pgEnum('persona_id', [
  'hop_head', 'dark_side_explorer', 'easy_sipper', 'sour_seeker',
  'malt_lover', 'wheat_wanderer', 'session_king', 'bold_adventurer',
  'crisp_purist', 'roast_devotee',
])

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  cognitoSub: text('cognito_sub').notNull().unique(),
  email: text('email').notNull().unique(),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------------------------------------------------------------------------
// User profiles — taste vector + persona
//
// flavorVector: ordered real[7] per FLAVOR_VECTOR_DIMENSIONS canonical order.
// embedding:    1536-dim semantic embedding of the flavor profile text.
// schemaVersion: bump when flavor vector schema changes; stale profiles
//                are re-embedded lazily on login.
// ---------------------------------------------------------------------------

export const userProfiles = pgTable(
  'user_profiles',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    flavorVector: real('flavor_vector').array().notNull(),
    embedding: vector1536('embedding'),
    schemaVersion: integer('schema_version')
      .notNull()
      .default(FLAVOR_VECTOR_SCHEMA_VERSION),
    personaId: personaEnum('persona_id'),
    ratingCount: integer('rating_count').notNull().default(0),
    ratingsVisibleToFriends: boolean('ratings_visible_to_friends').notNull().default(true),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('user_profiles_embedding_idx').using('hnsw', t.embedding.op('vector_cosine_ops'))],
)

// ---------------------------------------------------------------------------
// Beers catalog
// ---------------------------------------------------------------------------

export const beers = pgTable(
  'beers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    brewery: text('brewery').notNull(),
    style: beerStyleEnum('style').notNull(),
    abv: real('abv'),
    description: text('description'),
    flavorVector: real('flavor_vector').array().notNull(),
    embedding: vector1536('embedding'),
    schemaVersion: integer('schema_version')
      .notNull()
      .default(FLAVOR_VECTOR_SCHEMA_VERSION),
    styleTags: text('style_tags').array().notNull().default(sql`ARRAY[]::text[]`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('beers_embedding_idx').using('hnsw', t.embedding.op('vector_cosine_ops')),
    index('beers_style_idx').on(t.style),
  ],
)

// ---------------------------------------------------------------------------
// Venues
// ---------------------------------------------------------------------------

export const venues = pgTable('venues', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  address: text('address'),
  city: text('city'),
  qrCodeToken: text('qr_code_token').notNull().unique(),
  ownerUserId: uuid('owner_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const venueTapList = pgTable(
  'venue_tap_list',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    venueId: uuid('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    beerId: uuid('beer_id')
      .notNull()
      .references(() => beers.id, { onDelete: 'cascade' }),
    active: boolean('active').notNull().default(true),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
    removedAt: timestamp('removed_at', { withTimezone: true }),
  },
  (t) => [index('venue_tap_list_venue_active_idx').on(t.venueId, t.active)],
)

// ---------------------------------------------------------------------------
// Beer ratings
// ---------------------------------------------------------------------------

export const beerRatings = pgTable(
  'beer_ratings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    beerId: uuid('beer_id')
      .notNull()
      .references(() => beers.id, { onDelete: 'cascade' }),
    venueId: uuid('venue_id').references(() => venues.id, { onDelete: 'set null' }),
    rating: ratingEnum('rating').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('beer_ratings_user_idx').on(t.userId),
    index('beer_ratings_beer_venue_idx').on(t.beerId, t.venueId),
  ],
)

// ---------------------------------------------------------------------------
// Group sessions
// ---------------------------------------------------------------------------

export const groupSessions = pgTable('group_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  hostUserId: uuid('host_user_id').references(() => users.id, { onDelete: 'set null' }),
  venueId: uuid('venue_id').references(() => venues.id, { onDelete: 'set null' }),
  status: groupSessionStatusEnum('status').notNull().default('open'),
  expiresAt: timestamp('expires_at', { withTimezone: true })
    .notNull()
    .default(sql`NOW() + INTERVAL '4 hours'`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const groupParticipants = pgTable(
  'group_participants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => groupSessions.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    displayName: text('display_name'),
    flavorVector: real('flavor_vector').array(),
    schemaVersion: integer('schema_version').default(FLAVOR_VECTOR_SCHEMA_VERSION),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('group_participants_session_idx').on(t.sessionId)],
)

// ---------------------------------------------------------------------------
// Friend graph
// ---------------------------------------------------------------------------

export const friendships = pgTable(
  'friendships',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    friendId: uuid('friend_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('friendships_user_idx').on(t.userId)],
)
