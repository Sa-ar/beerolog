// Archetype metadata map (slice #286). One entry per shareable taste archetype
// the API can emit (slice #285). Const-object enum per frontend-conventions.md.
// User-facing copy (name/tagline/traits) and radar-axis labels live in i18n
// (`archetypes.*` / `archetypeAxis.*` in common.json); this map holds only the
// non-localized icon + representative radar values.
import { buildArchetypeSvg } from '@beerolog/icons'
import type { components } from './api-client/schema'

export const ARCHETYPE_KEYS = [
  'adventurer',
  'hop-chaser',
  'bitter-zealot',
  'malt-romantic',
  'roast-devotee',
  'fruit-forward',
  'sour-seeker',
  'smoke-wanderer',
  'heavyweight',
  'easy-drinker',
  'crisp-classicist',
  'balanced-explorer',
] as const

export type ArchetypeKey = (typeof ARCHETYPE_KEYS)[number]

// Compile-time guard: our local key set must stay identical to the API enum.
// Drift (a key added/removed on either side) fails web typecheck here.
type ApiArchetypeKey = components['schemas']['ArchetypeKey']
const _keysMatchApi: ArchetypeKey extends ApiArchetypeKey
  ? ApiArchetypeKey extends ArchetypeKey
    ? true
    : never
  : never = true
void _keysMatchApi

// Radar axes shown on the archetype card, in a fixed order. Mirrors the axes
// TasteProfileSummary plots. Labels are localized under i18n `archetypeAxis.*`.
export const ARCHETYPE_RADAR_AXES = [
  'bitterness',
  'sweetness',
  'body',
  'hoppy',
  'malty',
  'roasty',
  'sour',
  'novelty',
] as const

export type ArchetypeRadarAxis = (typeof ARCHETYPE_RADAR_AXES)[number]

export type ArchetypeMeta = {
  /** @beerolog/icons SVG markup (never emoji). */
  icon: string
  /** Representative dial values (0..1) per radar axis. */
  radar: Record<ArchetypeRadarAxis, number>
}

const svg = (key: ArchetypeKey): string => buildArchetypeSvg(key) ?? ''

export const ARCHETYPES: Record<ArchetypeKey, ArchetypeMeta> = {
  adventurer: {
    icon: svg('adventurer'),
    radar: { bitterness: 0.55, sweetness: 0.5, body: 0.5, hoppy: 0.6, malty: 0.4, roasty: 0.4, sour: 0.55, novelty: 0.95 },
  },
  'hop-chaser': {
    icon: svg('hop-chaser'),
    radar: { bitterness: 0.7, sweetness: 0.3, body: 0.45, hoppy: 0.95, malty: 0.35, roasty: 0.2, sour: 0.2, novelty: 0.6 },
  },
  'bitter-zealot': {
    icon: svg('bitter-zealot'),
    radar: { bitterness: 0.98, sweetness: 0.2, body: 0.5, hoppy: 0.9, malty: 0.3, roasty: 0.35, sour: 0.2, novelty: 0.55 },
  },
  'malt-romantic': {
    icon: svg('malt-romantic'),
    radar: { bitterness: 0.3, sweetness: 0.65, body: 0.65, hoppy: 0.25, malty: 0.95, roasty: 0.4, sour: 0.15, novelty: 0.35 },
  },
  'roast-devotee': {
    icon: svg('roast-devotee'),
    radar: { bitterness: 0.65, sweetness: 0.4, body: 0.7, hoppy: 0.2, malty: 0.5, roasty: 0.95, sour: 0.1, novelty: 0.4 },
  },
  'fruit-forward': {
    icon: svg('fruit-forward'),
    radar: { bitterness: 0.35, sweetness: 0.6, body: 0.45, hoppy: 0.45, malty: 0.3, roasty: 0.15, sour: 0.5, novelty: 0.6 },
  },
  'sour-seeker': {
    icon: svg('sour-seeker'),
    radar: { bitterness: 0.3, sweetness: 0.35, body: 0.35, hoppy: 0.2, malty: 0.2, roasty: 0.1, sour: 0.95, novelty: 0.65 },
  },
  'smoke-wanderer': {
    icon: svg('smoke-wanderer'),
    radar: { bitterness: 0.45, sweetness: 0.35, body: 0.6, hoppy: 0.3, malty: 0.5, roasty: 0.55, sour: 0.15, novelty: 0.7 },
  },
  heavyweight: {
    icon: svg('heavyweight'),
    radar: { bitterness: 0.55, sweetness: 0.5, body: 0.95, hoppy: 0.4, malty: 0.7, roasty: 0.5, sour: 0.15, novelty: 0.5 },
  },
  'easy-drinker': {
    icon: svg('easy-drinker'),
    radar: { bitterness: 0.3, sweetness: 0.45, body: 0.3, hoppy: 0.35, malty: 0.35, roasty: 0.15, sour: 0.25, novelty: 0.4 },
  },
  'crisp-classicist': {
    icon: svg('crisp-classicist'),
    radar: { bitterness: 0.4, sweetness: 0.4, body: 0.45, hoppy: 0.4, malty: 0.5, roasty: 0.2, sour: 0.15, novelty: 0.3 },
  },
  'balanced-explorer': {
    icon: svg('balanced-explorer'),
    radar: { bitterness: 0.5, sweetness: 0.5, body: 0.5, hoppy: 0.5, malty: 0.5, roasty: 0.4, sour: 0.4, novelty: 0.55 },
  },
}

// i18n key builders — keep the archetype copy namespace in one place so callers
// (react-i18next `t` in-app, or a server `getFixedT`) never hand-build paths.
export const archetypeNameKey = (key: ArchetypeKey) => `archetypes.${key}.name`
export const archetypeTaglineKey = (key: ArchetypeKey) => `archetypes.${key}.tagline`
export const archetypeTraitsKey = (key: ArchetypeKey) => `archetypes.${key}.traits`
export const archetypeAxisKey = (axis: ArchetypeRadarAxis) => `archetypeAxis.${axis}`

export function isArchetypeKey(value: string): value is ArchetypeKey {
  return (ARCHETYPE_KEYS as readonly string[]).includes(value)
}
