// =============================================================================
// Flavor Vector — VERSIONED CONTRACT
//
// BREAKING CHANGE POLICY: incrementing FLAVOR_VECTOR_SCHEMA_VERSION requires
// a migration job to re-embed all user_profiles and beers. Do not add, remove,
// or reorder dimensions without bumping the version and writing a migration.
// =============================================================================

export const FLAVOR_VECTOR_SCHEMA_VERSION = 1 as const
export type FlavorVectorSchemaVersion = typeof FLAVOR_VECTOR_SCHEMA_VERSION

// Canonical dimension order — matches DB storage order in real[] columns.
export const FLAVOR_VECTOR_DIMENSIONS = [
  'bitterness', // 0 — 0=none, 1=very bitter
  'sweetness',  // 1 — 0=dry, 1=very sweet
  'fruitiness', // 2 — 0=none, 1=very fruity/citrusy
  'roast',      // 3 — 0=none, 1=strong coffee/chocolate
  'sourness',   // 4 — 0=none, 1=very tart/sour
  'body',       // 5 — 0=light/thin, 1=full/rich
  'adventure',  // 6 — 0=safe/familiar, 1=adventurous
] as const

export type FlavorVectorDimension = (typeof FLAVOR_VECTOR_DIMENSIONS)[number]

export type FlavorVector = {
  readonly bitterness: number
  readonly sweetness: number
  readonly fruitiness: number
  readonly roast: number
  readonly sourness: number
  readonly body: number
  readonly adventure: number
}

/** Serialize to ordered number[] for DB storage (real[]). */
export function serializeFlavorVector(v: FlavorVector): number[] {
  return FLAVOR_VECTOR_DIMENSIONS.map((d) => v[d])
}

/** Deserialize from DB real[] to typed FlavorVector. */
export function deserializeFlavorVector(arr: number[]): FlavorVector {
  if (arr.length !== FLAVOR_VECTOR_DIMENSIONS.length) {
    throw new Error(
      `FlavorVector dimension mismatch: expected ${FLAVOR_VECTOR_DIMENSIONS.length}, got ${arr.length}`,
    )
  }
  return {
    bitterness: arr[0]!,
    sweetness: arr[1]!,
    fruitiness: arr[2]!,
    roast: arr[3]!,
    sourness: arr[4]!,
    body: arr[5]!,
    adventure: arr[6]!,
  }
}

/** Centered vector — used when a user hasn't answered a dimension. */
export const NEUTRAL_FLAVOR_VECTOR: FlavorVector = {
  bitterness: 0.5,
  sweetness: 0.5,
  fruitiness: 0.5,
  roast: 0.5,
  sourness: 0.5,
  body: 0.5,
  adventure: 0.5,
}

// =============================================================================
// Beer & Catalog
//
// Wire-level API DTOs now come from the generated OpenAPI client in apps/web.
// Keep this package focused on shared domain primitives used outside the HTTP
// contract surface.
// =============================================================================

export type BeerStyle =
  | 'lager'
  | 'pilsner'
  | 'kolsch'
  | 'wheat'
  | 'pale_ale'
  | 'ipa'
  | 'amber_ale'
  | 'brown_ale'
  | 'stout'
  | 'porter'
  | 'sour'
  | 'saison'
  | 'dunkel'
  | 'vienna_lager'
  | 'other'

// =============================================================================
// Ratings & Feedback
// =============================================================================

// Rating vocabulary as a const object so call sites reference RATINGS.unknown
// rather than bare string literals; the union type is derived from it.
// Mirror of the API's RatingValue (apps/api/app/ratings_vocab.py).
export const RATINGS = {
  loved: 'loved',
  fine: 'fine',
  disliked: 'disliked',
  unknown: 'unknown',
} as const

export type Rating = (typeof RATINGS)[keyof typeof RATINGS]

// =============================================================================
// User & Persona
// =============================================================================

export type PersonaId =
  | 'easy_sipper'
  | 'hop_head'
  | 'dark_side'
  | 'sour_seeker'
  | 'sweet_tooth'
  | 'balanced'
  | 'adventurer'
  | 'classic'
  | 'roast_master'
  | 'fruit_stand'

export type Persona = {
  id: PersonaId
  name: string
  description: string
  icon: string
  dominantDimensions: FlavorVectorDimension[]
}

// =============================================================================
// Group Session
// =============================================================================

export type GroupSessionStatus = 'open' | 'completed' | 'expired'

export type GroupParticipant = {
  id: string
  displayName?: string
  completedAt: string | null
}

export type GroupSession = {
  id: string
  hostUserId: string
  venueId: string | null
  status: GroupSessionStatus
  participants: GroupParticipant[]
  expiresAt: string
  createdAt: string
}
