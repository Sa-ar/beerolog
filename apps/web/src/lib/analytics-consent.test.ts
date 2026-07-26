import { afterEach, describe, expect, it } from 'vitest'
import { getAnalyticsConsent, hasAnalyticsConsent, writeAnalyticsConsent } from './analytics-consent'

afterEach(() => localStorage.clear())

describe('analytics-consent', () => {
  it('is null (dormant) with no decision', () => {
    expect(getAnalyticsConsent()).toBeNull()
    expect(hasAnalyticsConsent()).toBe(false)
  })

  it('round-trips granted / denied', () => {
    writeAnalyticsConsent('granted')
    expect(getAnalyticsConsent()).toBe('granted')
    expect(hasAnalyticsConsent()).toBe(true)
    writeAnalyticsConsent('denied')
    expect(hasAnalyticsConsent()).toBe(false)
  })
})
