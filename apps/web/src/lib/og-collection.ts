// Pure params for the "catch 'em all" collection-brag image (issue #334).
// Mirrors og-catch: shown only when a Set is complete -> name + caught/total.
import type { OgLang, OgSize } from './og-image'

const DIMENSIONS: Record<OgSize, { width: number; height: number }> = {
  story: { width: 1080, height: 1920 },
  og: { width: 1200, height: 630 },
}

export type CollectionOgParams = {
  name: string
  caught: number
  total: number
  lang: OgLang
  size: OgSize
  width: number
  height: number
}

function nonNegInt(raw: string | null): number {
  const n = Number.parseInt(raw ?? '0', 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** Parse the brag-card query into image params, or null when the Set name is absent. */
export function parseCollectionOgParams(url: string): CollectionOgParams | null {
  const p = new URL(url).searchParams
  const name = p.get('name')
  if (!name) return null
  const lang: OgLang = (p.get('lang') ?? '').startsWith('he') ? 'he' : 'en'
  const size: OgSize = p.get('size') === 'story' ? 'story' : 'og'
  return {
    name,
    caught: nonNegInt(p.get('caught')),
    total: nonNegInt(p.get('total')),
    lang,
    size,
    ...DIMENSIONS[size],
  }
}
