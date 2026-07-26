import { describe, expect, it } from 'vitest'
import { capture } from './analytics'

// Before initAnalytics() runs (e.g. no VITE_POSTHOG_PROJECT_TOKEN, or SSR), capture() must
// be a silent no-op and never throw — events simply drop.
describe('analytics.capture', () => {
  it('is a no-op before init', () => {
    expect(() => capture('cta_click', { key: 'hop-chaser', target: 'try' })).not.toThrow()
    expect(() => capture('quiz_start', { surface: 'try', referred: true })).not.toThrow()
  })
})
