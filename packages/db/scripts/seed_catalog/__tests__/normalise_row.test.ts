/**
 * Pure-function tests for the seed pipeline substeps. Run with:
 *   pnpm --filter @beerolog/db test
 */

import { describe, expect, it } from 'vitest'

import {
  classifyMarketTier,
  deriveBody,
  deriveColor,
  deriveSlug,
  deriveSweetness,
  normaliseRow,
  normaliseStyle,
  type ScrapedBeer,
} from '../normalise_row'
import { computeAdventurousness, computeStyleRarity } from '../adventurousness'
import { composeBeerText } from '../compose_text'

describe('deriveBody / deriveSweetness (#274 backfill)', () => {
  it('gives stouts a full body and IPAs a dry, medium profile', () => {
    expect(deriveBody('Imperial Stout')).toBe('full')
    expect(deriveBody('American IPA')).toBe('medium')
    expect(deriveSweetness('American IPA')).toBe('dry')
    expect(deriveSweetness('Imperial Stout')).toBe('sweet')
  })

  it('makes lagers and wheats light-bodied and never returns null', () => {
    expect(deriveBody('Pilsner')).toBe('light')
    expect(deriveBody('Hefeweizen')).toBe('light')
    expect(deriveBody('Saison')).toBe('light')
  })

  it('normaliseRow fills body/sweetness from style when the source omits them', () => {
    const row = normaliseRow({
      name: 'X',
      brewery: 'Alexander',
      breweryCountry: 'IL',
      rawStyle: 'Stout',
      abv: 5,
    })
    expect(row.body).toBe('full')
    expect(row.sweetness).toBe('balanced')
  })
})

const ALEXANDER_BLAZER: ScrapedBeer = {
  name: 'Blazer',
  brewery: 'Alexander',
  breweryCountry: 'IL',
  rawStyle: 'IPA',
  abv: 6.2,
  ibu: 65,
  hops: ['Citra', 'Mosaic', 'Centennial'],
  malts: ['Pilsner', 'Caramel-40'],
  rawColor: 'gold',
  tastingNotes: 'Citrus and pine forward, dry finish.',
  tastingNotesLang: 'en',
  notesSource: 'brewery',
  sourceUrl: 'https://alexander-brewery.example/blazer',
}

describe('classifyMarketTier', () => {
  it('tags Israeli mainstream breweries as mainstream', () => {
    expect(classifyMarketTier('Tempo', 'IL')).toBe('mainstream')
    expect(classifyMarketTier('Goldstar', 'IL')).toBe('mainstream')
  })
  it('tags Israeli craft breweries as craft (including Schnitt)', () => {
    expect(classifyMarketTier('Alexander', 'IL')).toBe('craft')
    expect(classifyMarketTier('Schnitt', 'IL')).toBe('craft')
  })
  it('treats unknown Israeli breweries as craft by default', () => {
    expect(classifyMarketTier('Some New Microbrewery', 'IL')).toBe('craft')
  })
  it('tags non-Israeli beers as import', () => {
    expect(classifyMarketTier('Hoegaarden', 'BE')).toBe('import')
    expect(classifyMarketTier('Guinness', 'IE')).toBe('import')
  })
})

describe('normaliseStyle', () => {
  it('maps common aliases to the canonical style', () => {
    expect(normaliseStyle('IPA')).toBe('American IPA')
    expect(normaliseStyle('india pale ale')).toBe('American IPA')
    expect(normaliseStyle('Pale Ale')).toBe('Pale Ale')
    expect(normaliseStyle('hazy ipa')).toBe('Hazy IPA')
  })
  it('passes unknown styles through as-is', () => {
    expect(normaliseStyle('Smoked Helles')).toBe('Smoked Helles')
  })
})

describe('deriveColor', () => {
  it('respects an explicit color when present', () => {
    expect(deriveColor('amber', 'Pale Ale')).toBe('amber')
  })
  it('derives dark for stouts and porters', () => {
    expect(deriveColor(undefined, 'Stout')).toBe('dark')
    expect(deriveColor(undefined, 'Imperial Stout')).toBe('dark')
    expect(deriveColor(undefined, 'Porter')).toBe('dark')
  })
  it('derives gold for lagers', () => {
    expect(deriveColor(undefined, 'Pale Lager')).toBe('gold')
  })
})

describe('deriveSlug', () => {
  it('produces a brewery-name slug', () => {
    expect(deriveSlug('Blazer', 'Alexander')).toBe('alexander-blazer')
  })
  it('handles spaces and special characters', () => {
    expect(deriveSlug('House Pale', 'Schnitt')).toBe('schnitt-house-pale')
    expect(deriveSlug("Saint's Tale", "Jem's")).toBe('jem-s-saint-s-tale')
  })
})

describe('normaliseRow', () => {
  it('emits a fully normalised row including derived fields', () => {
    const row = normaliseRow(ALEXANDER_BLAZER)
    expect(row.id).toBe('alexander-blazer')
    expect(row.style).toBe('American IPA')
    expect(row.marketTier).toBe('craft')
    expect(row.notesSource).toBe('brewery')
    expect(row.color).toBe('gold')
    expect(row.tastingNotesLang).toBe('en')
  })
  it('flags missing tasting notes as synthetic by default', () => {
    const row = normaliseRow({
      ...ALEXANDER_BLAZER,
      tastingNotes: undefined,
      notesSource: undefined,
    })
    expect(row.notesSource).toBe('synthetic')
  })
})

describe('computeStyleRarity + computeAdventurousness', () => {
  it('gives mainstream lagers near-zero adventurousness', () => {
    const goldstar = normaliseRow({
      name: 'Goldstar Lager',
      brewery: 'Tempo',
      breweryCountry: 'IL',
      rawStyle: 'Amber Lager',
      abv: 4.9,
    })
    const rarity = computeStyleRarity([goldstar])
    expect(computeAdventurousness(goldstar, rarity)).toBeLessThan(0.4)
  })
  it('gives high-ABV craft beers high adventurousness', () => {
    const imperial = normaliseRow({
      name: 'Big One',
      brewery: 'Schnitt',
      breweryCountry: 'IL',
      rawStyle: 'Imperial Stout',
      abv: 10.5,
    })
    const rarity = computeStyleRarity([imperial])
    expect(computeAdventurousness(imperial, rarity)).toBeGreaterThan(0.6)
  })
  it('clamps to [0, 1]', () => {
    const extreme = normaliseRow({
      name: 'x',
      brewery: 'Negev',
      breweryCountry: 'IL',
      rawStyle: 'Hazy IPA',
      abv: 14.0,
    })
    const rarity = computeStyleRarity([extreme])
    const score = computeAdventurousness(extreme, rarity)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(1)
  })
})

describe('composeBeerText', () => {
  it('produces a deterministic embedding source string with all clauses present', () => {
    const row = normaliseRow(ALEXANDER_BLAZER)
    const text = composeBeerText(row)
    expect(text).toContain('American IPA from Alexander, IL')
    expect(text).toContain('6.2% ABV, IBU 65')
    expect(text).toContain('Hops: Citra, Mosaic, Centennial')
    expect(text).toContain('Malts: Pilsner, Caramel-40')
    expect(text).toContain('gold colour')
    expect(text).toContain('Citrus and pine forward')
    expect(text).toContain('Sensory profile:')
    expect(text).toContain('grapefruit juice')
  })
  it('omits null clauses cleanly', () => {
    const minimal = normaliseRow({
      name: 'X',
      brewery: 'Y',
      breweryCountry: 'IL',
      rawStyle: 'Lager',
      abv: 5.0,
    })
    const text = composeBeerText(minimal)
    expect(text).not.toContain('Hops:')
    expect(text).not.toContain('Malts:')
    expect(text).not.toContain('null')
  })
})
