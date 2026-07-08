import { describe, expect, it } from 'vitest'
import { venueMapsUrl } from './beer-store-search'

describe('venueMapsUrl', () => {
  it('joins the parts present and skips the blanks', () => {
    const url = venueMapsUrl({ name: 'BeerBazaar', address: null, city: 'Tel Aviv' })
    expect(url).toContain(encodeURIComponent('BeerBazaar Tel Aviv'))
    expect(url).not.toContain('null')
  })
})
