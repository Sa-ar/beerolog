import { describe, expect, it } from 'vitest'
import { knowRatingForDirection, resolveKnowSwipe } from './swipe-know'

const T = 96

describe('swipe-know', () => {
  it('maps up/right/left to loved/fine/not-for-me', () => {
    expect(resolveKnowSwipe(0, -120, T)).toBe('loved') // up
    expect(resolveKnowSwipe(120, 0, T)).toBe('fine') // right
    expect(resolveKnowSwipe(-120, 0, T)).toBe('disliked') // left = not-for-me
    expect(resolveKnowSwipe(0, 120, T)).toBe('unknown') // down = don't know
  })

  it('returns null below the commit threshold', () => {
    expect(resolveKnowSwipe(40, 0, T)).toBeNull()
    expect(resolveKnowSwipe(0, -40, T)).toBeNull()
  })

  it('mirrors the horizontal axis in RTL', () => {
    expect(resolveKnowSwipe(120, 0, T, true)).toBe('disliked')
    expect(resolveKnowSwipe(-120, 0, T, true)).toBe('fine')
    expect(resolveKnowSwipe(0, -120, T, true)).toBe('loved') // vertical unaffected
  })

  it('exposes the live direction rating for stamps', () => {
    expect(knowRatingForDirection('up')).toBe('loved')
    expect(knowRatingForDirection('right', true)).toBe('disliked')
    expect(knowRatingForDirection(null)).toBeNull()
  })
})
