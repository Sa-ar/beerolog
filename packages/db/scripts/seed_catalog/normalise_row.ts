/**
 * normaliseRow: pure transform from scraped record → canonical Beer row.
 *
 * Each per-brewery scraper produces a `ScrapedBeer` shape. This module
 * normalises that shape into the schema row used by the seed step.
 * Style strings are mapped to a small fixed enum; unknown styles fall
 * through to `other` with a warning emitted to stderr.
 *
 * Pure. No I/O. Easy to fuzz.
 */

export type ScrapedBeer = {
  name: string
  nameHebrew?: string
  brewery: string
  breweryCountry: string
  rawStyle: string
  abv: number
  ibu?: number | null
  hops?: string[]
  malts?: string[]
  yeast?: string
  rawColor?: string
  rawBody?: string
  rawSweetness?: string
  tastingNotes?: string
  tastingNotesLang?: 'he' | 'en'
  notesSource?: 'brewery' | 'aggregator'
  imageUrl?: string
  sourceUrl?: string
}

export type NormalisedBeer = {
  id: string
  name: string
  nameHebrew: string | null
  brewery: string
  breweryCountry: string
  style: string
  abv: number
  ibu: number | null
  hops: string[] | null
  malts: string[] | null
  yeast: string | null
  color: 'pale' | 'gold' | 'amber' | 'brown' | 'dark'
  body: 'light' | 'medium' | 'full' | null
  sweetness: 'dry' | 'balanced' | 'sweet' | null
  marketTier: 'mainstream' | 'craft' | 'import'
  tastingNotes: string
  tastingNotesLang: 'he' | 'en'
  notesSource: 'brewery' | 'aggregator' | 'synthetic'
  imageUrl: string | null
  sourceUrl: string | null
}

const CRAFT_BREWERIES_IL = new Set([
  'Alexander',
  'Malka',
  'Herzl',
  'BeerBazaar',
  'Negev',
  "Jem's",
  'Dancing Camel',
  'Norman',
  'Schnitt',
])

const MAINSTREAM_BREWERIES_IL = new Set(['Tempo', 'Goldstar', 'Maccabee'])

const STYLE_VOCAB: { [key: string]: string } = {
  ipa: 'American IPA',
  'india pale ale': 'American IPA',
  'pale ale': 'Pale Ale',
  lager: 'Lager',
  'pale lager': 'Pale Lager',
  'amber lager': 'Amber Lager',
  pilsner: 'Pilsner',
  stout: 'Stout',
  'irish stout': 'Irish Stout',
  porter: 'Porter',
  saison: 'Saison',
  gose: 'Gose',
  witbier: 'Witbier',
  'wheat beer': 'Witbier',
  hefeweizen: 'Hefeweizen',
  'imperial stout': 'Imperial Stout',
  'dipa': 'Double IPA',
  'double ipa': 'Double IPA',
  'hazy ipa': 'Hazy IPA',
}

export function classifyMarketTier(
  brewery: string,
  breweryCountry: string,
): NormalisedBeer['marketTier'] {
  if (breweryCountry === 'IL') {
    if (MAINSTREAM_BREWERIES_IL.has(brewery)) return 'mainstream'
    if (CRAFT_BREWERIES_IL.has(brewery)) return 'craft'
    return 'craft'
  }
  return 'import'
}

export function normaliseStyle(raw: string): string {
  const key = raw.trim().toLowerCase()
  return STYLE_VOCAB[key] ?? raw.trim()
}

export function deriveColor(raw: string | undefined, style: string): NormalisedBeer['color'] {
  if (raw) {
    const lower = raw.toLowerCase()
    if (['pale', 'gold', 'amber', 'brown', 'dark'].includes(lower)) {
      return lower as NormalisedBeer['color']
    }
  }
  // Derive from style as a fallback.
  const lowerStyle = style.toLowerCase()
  if (/stout|porter/.test(lowerStyle)) return 'dark'
  if (/amber/.test(lowerStyle)) return 'amber'
  if (/wheat|witbier|gose|saison/.test(lowerStyle)) return 'pale'
  if (/lager|pilsner/.test(lowerStyle)) return 'gold'
  return 'gold'
}

export function deriveSlug(name: string, brewery: string): string {
  const slug = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  return `${slug(brewery)}-${slug(name)}`
}

export function normaliseRow(input: ScrapedBeer): NormalisedBeer {
  const style = normaliseStyle(input.rawStyle)
  return {
    id: deriveSlug(input.name, input.brewery),
    name: input.name,
    nameHebrew: input.nameHebrew ?? null,
    brewery: input.brewery,
    breweryCountry: input.breweryCountry,
    style,
    abv: input.abv,
    ibu: input.ibu ?? null,
    hops: input.hops && input.hops.length > 0 ? input.hops : null,
    malts: input.malts && input.malts.length > 0 ? input.malts : null,
    yeast: input.yeast ?? null,
    color: deriveColor(input.rawColor, style),
    body: normaliseBody(input.rawBody),
    sweetness: normaliseSweetness(input.rawSweetness),
    marketTier: classifyMarketTier(input.brewery, input.breweryCountry),
    tastingNotes: input.tastingNotes ?? '',
    tastingNotesLang: input.tastingNotesLang ?? 'en',
    notesSource: input.notesSource ?? 'synthetic',
    imageUrl: input.imageUrl ?? null,
    sourceUrl: input.sourceUrl ?? null,
  }
}

function normaliseBody(raw: string | undefined): NormalisedBeer['body'] {
  if (!raw) return null
  const lower = raw.toLowerCase()
  if (['light', 'medium', 'full'].includes(lower)) {
    return lower as NormalisedBeer['body']
  }
  return null
}

function normaliseSweetness(raw: string | undefined): NormalisedBeer['sweetness'] {
  if (!raw) return null
  const lower = raw.toLowerCase()
  if (['dry', 'balanced', 'sweet'].includes(lower)) {
    return lower as NormalisedBeer['sweetness']
  }
  return null
}
