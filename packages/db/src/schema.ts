import { pgTable, pgEnum, uuid, text, real, integer, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { FLAVOR_VECTOR_SCHEMA_VERSION } from '@beerolog/types'

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const ratingEnum = pgEnum('rating', ['loved', 'fine', 'disliked'])
export const beerStyleEnum = pgEnum('beer_style', [
  'lager', 'pilsner', 'kolsch', 'wheat', 'pale_ale', 'ipa',
  'amber_ale', 'brown_ale', 'stout', 'porter', 'sour',
  'saison', 'dunkel', 'vienna_lager', 'other',
])

// ---------------------------------------------------------------------------
// Supported MVP persistence
// ---------------------------------------------------------------------------

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email'),
  displayName: text('display_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const userProfiles = pgTable(
  'user_profiles',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    flavorVector: real('flavor_vector').array().notNull(),
    schemaVersion: integer('schema_version')
      .notNull()
      .default(FLAVOR_VECTOR_SCHEMA_VERSION),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
)

export const beerRatings = pgTable(
  'beer_ratings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    beerId: text('beer_id').notNull(),
    rating: ratingEnum('rating'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('beer_ratings_user_idx').on(t.userId),
    index('beer_ratings_beer_idx').on(t.beerId),
  ],
)

export const userStyleSuppressions = pgTable(
  'user_style_suppressions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    style: beerStyleEnum('style').notNull(),
    remainingCount: integer('remaining_count').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('user_style_suppressions_user_idx').on(t.userId),
    uniqueIndex('user_style_suppressions_user_style_idx').on(t.userId, t.style),
  ],
)
