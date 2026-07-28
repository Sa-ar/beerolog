import { describe, expect, it } from 'vitest'
import { parseCollectionOgParams } from './og-collection'

const BASE = 'https://beerolog.com/api/og/collection'

describe('parseCollectionOgParams', () => {
  it('parses name + caught/total, defaults to og + en', () => {
    expect(parseCollectionOgParams(`${BASE}?name=Israeli%20Craft%20Starter&caught=6&total=6`)).toEqual({
      name: 'Israeli Craft Starter',
      caught: 6,
      total: 6,
      lang: 'en',
      size: 'og',
      width: 1200,
      height: 630,
    })
  })

  it('returns null when the set name is missing', () => {
    expect(parseCollectionOgParams(BASE)).toBeNull()
  })

  it('honors size=story and lang=he', () => {
    const p = parseCollectionOgParams(`${BASE}?name=X&size=story&lang=he`)
    expect(p?.size).toBe('story')
    expect(p?.width).toBe(1080)
    expect(p?.lang).toBe('he')
  })

  it('coerces garbage/negative counts to 0', () => {
    const p = parseCollectionOgParams(`${BASE}?name=X&caught=-3&total=abc`)
    expect(p?.caught).toBe(0)
    expect(p?.total).toBe(0)
  })
})
