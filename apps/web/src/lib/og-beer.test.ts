import { describe, expect, it } from 'vitest'
import { beerOgSubtitle } from './og-beer'

describe('beerOgSubtitle (#277)', () => {
  it('composes brewery, style and ABV', () => {
    expect(beerOgSubtitle({ name: 'Blazer', brewery: 'Alexander', style: 'IPA', abv: 6.2 })).toBe(
      'Alexander · IPA · 6.2% ABV',
    )
  })
})
