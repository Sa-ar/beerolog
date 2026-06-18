import { describe, expect, it } from 'vitest'
import { COOKIE_CLASSIFICATIONS, COOKIE_REGISTRY } from './cookies'

describe('cookie registry', () => {
  it('gives every cookie a name, classification, duration and purpose key', () => {
    for (const cookie of COOKIE_REGISTRY) {
      expect(cookie.name).toBeTruthy()
      expect(COOKIE_CLASSIFICATIONS).toContain(cookie.classification)
      expect(cookie.durationDays).toBeGreaterThan(0)
      expect(cookie.purposeKey).toBeTruthy()
    }
  })

  it('discloses the essential age gate and functional language cookies', () => {
    const age = COOKIE_REGISTRY.find((c) => c.name === 'age_verified')
    const lang = COOKIE_REGISTRY.find((c) => c.name === 'lang')
    expect(age?.classification).toBe('essential')
    expect(lang?.classification).toBe('functional')
  })
})
