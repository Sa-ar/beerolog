import { describe, expect, it } from 'vitest'
import { catchCardModel, parseCatchOgParams } from './og-catch'

const BASE = 'https://beerolog.com/api/og/catch'

describe('parseCatchOgParams', () => {
  it('parses name, defaults to og size + en, no rating/photo', () => {
    expect(parseCatchOgParams(`${BASE}?name=Malka%20Stout`)).toEqual({
      name: 'Malka Stout',
      rating: null,
      photo: null,
      lang: 'en',
      size: 'og',
      width: 1200,
      height: 630,
    })
  })

  it('returns null when name is missing (nothing to render)', () => {
    expect(parseCatchOgParams(BASE)).toBeNull()
  })

  it('honors size=story, lang=he, a valid rating and a photo url', () => {
    const p = parseCatchOgParams(`${BASE}?name=X&size=story&lang=he&rating=loved&photo=https%3A%2F%2Fb%2F1.jpg`)
    expect(p?.size).toBe('story')
    expect(p?.width).toBe(1080)
    expect(p?.lang).toBe('he')
    expect(p?.rating).toBe('loved')
    expect(p?.photo).toBe('https://b/1.jpg')
  })

  it('drops an out-of-vocabulary rating to null', () => {
    expect(parseCatchOgParams(`${BASE}?name=X&rating=amazing`)?.rating).toBeNull()
  })
})

describe('catchCardModel', () => {
  const p = parseCatchOgParams(`${BASE}?name=X&rating=loved&photo=https%3A%2F%2Fb%2F1.jpg`)!

  it('is LTR for en and RTL for he', () => {
    expect(catchCardModel(p).dir).toBe('ltr')
    expect(catchCardModel({ ...p, lang: 'he' }).dir).toBe('rtl')
  })

  it('flags story size and a present photo', () => {
    expect(catchCardModel({ ...p, size: 'story' }).isStory).toBe(true)
    expect(catchCardModel(p).hasPhoto).toBe(true)
  })

  it('reports no photo and no rating label when absent', () => {
    const bare = parseCatchOgParams(`${BASE}?name=X`)!
    expect(catchCardModel(bare).hasPhoto).toBe(false)
    expect(catchCardModel(bare).ratingLabelKey).toBeNull()
  })
})
