// Pure params + display model for the single-catch share image (issue #332).
// Mirrors og-image.ts: the route handler stays thin, all logic is unit-testable
// here. A catch card = the user's proof photo + beer name + rating + brand.
import { RATINGS, type Rating } from '@beerolog/types'
import { dirFor } from '../i18n/locale-cookie'
import type { OgLang, OgSize } from './og-image'

const DIMENSIONS: Record<OgSize, { width: number; height: number }> = {
  story: { width: 1080, height: 1920 },
  og: { width: 1200, height: 630 },
}

export type CatchOgParams = {
  name: string
  rating: Rating | null
  photo: string | null
  lang: OgLang
  size: OgSize
  width: number
  height: number
}

/** Parse the catch-card query into image params, or null when there's no beer name. */
export function parseCatchOgParams(url: string): CatchOgParams | null {
  const params = new URL(url).searchParams
  const name = params.get('name')
  if (!name) return null
  const lang: OgLang = (params.get('lang') ?? '').startsWith('he') ? 'he' : 'en'
  const size: OgSize = params.get('size') === 'story' ? 'story' : 'og'
  const ratingRaw = params.get('rating')
  const rating: Rating | null = ratingRaw && ratingRaw in RATINGS ? (ratingRaw as Rating) : null
  return { name, rating, photo: params.get('photo'), lang, size, ...DIMENSIONS[size] }
}

/** Layout/copy decisions for the catch card — pure, so en/he/no-photo are testable. */
export function catchCardModel(p: CatchOgParams) {
  return {
    isStory: p.size === 'story',
    dir: dirFor(p.lang),
    hasPhoto: Boolean(p.photo),
    ratingLabelKey: p.rating ? `beerDetail.catch.${p.rating}` : null,
  }
}
