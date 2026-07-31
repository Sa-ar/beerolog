import { describe, expect, it } from 'vitest'
import { resolveWantSwipe, wantActionForArrowKey, wantActionForDirection } from './swipe-want'

const T = 96

describe('swipe-want', () => {
  it('maps cleared swipes to want / pass / must-try', () => {
    expect(resolveWantSwipe(120, 0, T)).toBe('want') // right
    expect(resolveWantSwipe(-120, 0, T)).toBe('pass') // left
    expect(resolveWantSwipe(0, -120, T)).toBe('must_try') // up
    expect(resolveWantSwipe(0, 120, T)).toBeNull() // down = no action
  })

  it('returns null below the commit threshold', () => {
    expect(resolveWantSwipe(40, 0, T)).toBeNull()
    expect(resolveWantSwipe(0, -40, T)).toBeNull()
  })

  it('mirrors the horizontal axis in RTL so want/pass stay intuitive', () => {
    expect(resolveWantSwipe(120, 0, T, true)).toBe('pass')
    expect(resolveWantSwipe(-120, 0, T, true)).toBe('want')
    // Vertical axis is unaffected by RTL.
    expect(resolveWantSwipe(0, -120, T, true)).toBe('must_try')
  })

  it('exposes the live direction action for stamps', () => {
    expect(wantActionForDirection('right')).toBe('want')
    expect(wantActionForDirection('left', true)).toBe('want')
    expect(wantActionForDirection(null)).toBeNull()
  })

  it('maps arrow keys like physical swipes (RTL mirrors L/R)', () => {
    expect(wantActionForArrowKey('ArrowRight')).toBe('want')
    expect(wantActionForArrowKey('ArrowLeft')).toBe('pass')
    expect(wantActionForArrowKey('ArrowUp')).toBe('must_try')
    expect(wantActionForArrowKey('ArrowDown')).toBeNull()
    expect(wantActionForArrowKey('ArrowRight', true)).toBe('pass')
    expect(wantActionForArrowKey('ArrowLeft', true)).toBe('want')
  })
})
