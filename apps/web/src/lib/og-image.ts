// Pure param parsing for the archetype social-image endpoint (slice #288).
// Images are pure functions of (key, lang, size) — no I/O here, so this is unit
// testable and the route handler stays thin.
import { isArchetypeKey, type ArchetypeKey } from './archetypes'
import type { Lang } from '../i18n/locale-cookie'

export type OgSize = 'story' | 'og'
// Reuse the app-wide language type rather than re-declaring the literals.
export type OgLang = Lang

// story = IG Stories vertical; og = link-preview card.
const DIMENSIONS: Record<OgSize, { width: number; height: number }> = {
  story: { width: 1080, height: 1920 },
  og: { width: 1200, height: 630 },
}

export type OgParams = {
  key: ArchetypeKey
  lang: OgLang
  size: OgSize
  width: number
  height: number
}

/** Parse a `key` + request URL into image params, or null for an unknown key. */
export function parseOgParams(key: string, url: string): OgParams | null {
  if (!isArchetypeKey(key)) return null
  const params = new URL(url).searchParams
  const lang: OgLang = (params.get('lang') ?? '').startsWith('he') ? 'he' : 'en'
  const size: OgSize = params.get('size') === 'story' ? 'story' : 'og'
  return { key, lang, size, ...DIMENSIONS[size] }
}
