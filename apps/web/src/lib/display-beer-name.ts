import { normalizeLang, type Lang } from '../i18n/locale-cookie'

/** Any catalog record carrying a canonical (English) name plus an optional
 * Hebrew name — beers and venues both match this shape. */
export type BilingualNamed = {
  name: string
  name_hebrew?: string | null
}

/**
 * Resolve the name to show for a bilingual catalog record. Hebrew wins when the
 * UI language is Hebrew and a Hebrew name exists; otherwise fall back to the
 * canonical name. Language is normalized through the shared `Lang` util, never
 * sniffed with `startsWith('he')`.
 */
export function displayBeerName(beer: BilingualNamed, lang: Lang | string | undefined | null): string {
  return normalizeLang(lang) === 'he' && beer.name_hebrew ? beer.name_hebrew : beer.name
}
