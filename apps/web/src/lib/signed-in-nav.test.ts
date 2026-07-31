import { describe, expect, it } from 'vitest'
import { SIGNED_IN_NAV, activeSignedInNavId } from './signed-in-nav'

describe('signed-in-nav', () => {
  it('exposes know, want, and scan — What I want as home', () => {
    expect(SIGNED_IN_NAV.map((item) => item.id)).toEqual(['whatIKnow', 'whatIWant', 'scan'])
    expect(SIGNED_IN_NAV.map((item) => item.to)).toEqual(['/rate', '/', '/menu'])
  })

  it('does not treat account routes as a primary-nav match', () => {
    expect(activeSignedInNavId('/account')).toBeNull()
    expect(activeSignedInNavId('/account/profile')).toBeNull()
  })

  it('matches each primary destination', () => {
    expect(activeSignedInNavId('/rate')).toBe('whatIKnow')
    expect(activeSignedInNavId('/rate/anything')).toBe('whatIKnow')
    expect(activeSignedInNavId('/')).toBe('whatIWant')
    expect(activeSignedInNavId('/menu')).toBe('scan')
    expect(activeSignedInNavId('/recommendations')).toBeNull()
  })
})
