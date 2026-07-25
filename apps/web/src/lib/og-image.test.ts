import { describe, expect, it } from 'vitest'
import { parseOgParams } from './og-image'

const URL_BASE = 'https://beerolog.com/api/og/taste/hop-chaser'

describe('parseOgParams', () => {
  it('defaults to og size and English', () => {
    const p = parseOgParams('hop-chaser', URL_BASE)
    expect(p).toEqual({ key: 'hop-chaser', lang: 'en', size: 'og', width: 1200, height: 630 })
  })

  it('honors ?size=story (1080x1920) for IG Stories', () => {
    const p = parseOgParams('hop-chaser', `${URL_BASE}?size=story`)
    expect(p?.size).toBe('story')
    expect(p?.width).toBe(1080)
    expect(p?.height).toBe(1920)
  })

  it('honors ?lang=he', () => {
    expect(parseOgParams('adventurer', `${URL_BASE}?lang=he`)?.lang).toBe('he')
  })

  it('returns null for an unknown key', () => {
    expect(parseOgParams('not-a-type', URL_BASE)).toBeNull()
  })
})
