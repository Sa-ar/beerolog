import { describe, expect, it } from 'vitest'
import { capture } from './analytics'

// Before initAnalytics() runs (e.g. no VITE_POSTHOG_PROJECT_TOKEN, or SSR), capture() must
// be a silent no-op and never throw — events simply drop.
describe('analytics.capture', () => {
  it('is a no-op before init', () => {
    expect(() => capture('cta_click', { key: 'hop-chaser', target: 'try' })).not.toThrow()
    expect(() => capture('quiz_start', { surface: 'try', referred: true })).not.toThrow()
  })

  it('accepts the page-reduction swipe-deck events as no-ops before init', () => {
    expect(() => capture('beer_swiped', { direction: 'want', deck: 'want' })).not.toThrow()
    expect(() => capture('want_to_try_added', { state: 'must_try' })).not.toThrow()
    expect(() => capture('menu_scan_scoped', { matched: 4 })).not.toThrow()
  })
})
