import { describe, expect, it } from 'vitest'
import { SIGNED_IN_NAV, activeSignedInNavId } from './signed-in-nav'

describe('signed-in-nav', () => {
  it('exposes exactly the two deck destinations, What I want as home', () => {
    expect(SIGNED_IN_NAV.map((item) => item.id)).toEqual(['whatIKnow', 'whatIWant'])
    expect(SIGNED_IN_NAV.map((item) => item.to)).toEqual(['/rate', '/'])
  })

  it('does not treat account routes as a primary-nav match', () => {
    expect(activeSignedInNavId('/account/security')).toBeNull()
    expect(activeSignedInNavId('/account/settings')).toBeNull()
    expect(activeSignedInNavId('/account/profile')).toBeNull()
  })

  it('matches What I want only at exact /, What I know on /rate', () => {
    expect(activeSignedInNavId('/')).toBe('whatIWant')
    expect(activeSignedInNavId('/rate')).toBe('whatIKnow')
    expect(activeSignedInNavId('/onboarding')).toBeNull()
  })
})
