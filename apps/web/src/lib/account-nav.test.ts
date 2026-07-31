import { describe, expect, it } from 'vitest'
import { isAccountPath } from './account-nav'

describe('isAccountPath', () => {
  it('matches account routes', () => {
    expect(isAccountPath('/account')).toBe(true)
    expect(isAccountPath('/account/profile')).toBe(true)
    expect(isAccountPath('/account/settings')).toBe(true)
  })

  it('rejects non-account routes', () => {
    expect(isAccountPath('/')).toBe(false)
    expect(isAccountPath('/rate')).toBe(false)
    expect(isAccountPath('/accounts')).toBe(false)
  })
})
