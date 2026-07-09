import { describe, expect, it } from 'vitest'
import { activeDirection, resolveSwipe, swipeProgress } from './swipe-rating'

const T = 100

describe('activeDirection', () => {
  it('picks the dominant axis', () => {
    expect(activeDirection(50, 10)).toBe('right')
    expect(activeDirection(-50, 10)).toBe('left')
    expect(activeDirection(10, -50)).toBe('up')
    expect(activeDirection(10, 50)).toBe('down')
  })

  it('is null at the origin', () => {
    expect(activeDirection(0, 0)).toBeNull()
  })
})

describe('resolveSwipe', () => {
  it('maps each direction past the threshold to its rating', () => {
    expect(resolveSwipe(T, 0, T)).toBe('loved') // right
    expect(resolveSwipe(-T, 0, T)).toBe('disliked') // left
    expect(resolveSwipe(0, -T, T)).toBe('fine') // up
    expect(resolveSwipe(0, T, T)).toBe('unknown') // down
  })

  it('returns null under the threshold (snaps back)', () => {
    expect(resolveSwipe(T - 1, 0, T)).toBeNull()
    expect(resolveSwipe(0, T - 1, T)).toBeNull()
  })

  it('resolves by the dominant axis on a diagonal drag', () => {
    expect(resolveSwipe(T, 30, T)).toBe('loved') // horizontal dominates
    expect(resolveSwipe(30, -T, T)).toBe('fine') // vertical dominates
  })
})

describe('swipeProgress', () => {
  it('is proportional under the threshold and clamps to 1', () => {
    expect(swipeProgress(50, 0, T)).toBeCloseTo(0.5)
    expect(swipeProgress(0, 200, T)).toBe(1)
    expect(swipeProgress(0, 0, T)).toBe(0)
  })
})
