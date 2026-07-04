import { describe, expect, it } from 'vitest'
import { beerStoreSearchUrl, venueMapsUrl } from './beer-store-search'

describe('beerStoreSearchUrl', () => {
  it('includes the area when provided', () => {
    const url = beerStoreSearchUrl('Goldstar', 'bottle shop', 'Tel Aviv')
    expect(url).toContain(encodeURIComponent('Goldstar bottle shop Tel Aviv'))
    expect(url.startsWith('https://www.google.com/maps/search/?api=1&query=')).toBe(true)
  })

  it('omits the area cleanly when blank (Maps uses device location)', () => {
    const url = beerStoreSearchUrl('Goldstar', 'pub', '   ')
    expect(url).toContain(encodeURIComponent('Goldstar pub'))
    expect(url).not.toContain('%20%20') // no dangling encoded spaces
  })

  it('collapses internal whitespace and encodes Hebrew + ampersands safely', () => {
    const url = beerStoreSearchUrl('Goldstar  &', 'pub', '  Tel Aviv')
    expect(url).toContain(encodeURIComponent('Goldstar & pub Tel Aviv'))
    expect(url).not.toContain('%20%20')
    const he = beerStoreSearchUrl('גולדסטאר', 'פאב', '')
    expect(he).toContain(encodeURIComponent('גולדסטאר פאב'))
  })
})

describe('venueMapsUrl', () => {
  it('joins the parts present and skips the blanks', () => {
    const url = venueMapsUrl({ name: 'BeerBazaar', address: null, city: 'Tel Aviv' })
    expect(url).toContain(encodeURIComponent('BeerBazaar Tel Aviv'))
    expect(url).not.toContain('null')
  })
})
