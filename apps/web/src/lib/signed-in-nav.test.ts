import { describe, expect, it } from 'vitest'
import { SIGNED_IN_NAV, activeSignedInNavId } from './signed-in-nav'

describe('signed-in-nav', () => {
  it('exposes four primary destinations in order', () => {
    expect(SIGNED_IN_NAV.map((item) => item.id)).toEqual(['home', 'scan', 'picks', 'rate'])
    expect(SIGNED_IN_NAV.map((item) => item.to)).toEqual([
      '/',
      '/menu',
      '/recommendations',
      '/rate',
    ])
  })

  it('does not treat account routes as a primary-nav match', () => {
    expect(activeSignedInNavId('/account/security')).toBeNull()
    expect(activeSignedInNavId('/account/settings')).toBeNull()
    expect(activeSignedInNavId('/account/profile')).toBeNull()
  })

  it('matches home only at exact /', () => {
    expect(activeSignedInNavId('/')).toBe('home')
    expect(activeSignedInNavId('/onboarding')).toBeNull()
  })
})
