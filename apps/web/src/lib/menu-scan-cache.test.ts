import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MENU_SCAN_CACHE_KEY,
  MENU_SCAN_CACHE_TTL_MS,
  clearMenuScanCache,
  loadMenuScanCache,
  saveMenuScanCache,
} from './menu-scan-cache'
import type { MenuScanResultItem } from './menu-scan'

const sampleResult: MenuScanResultItem = {
  raw_text: 'Double Trouble',
  matched_id: 'schnitt-double-trouble',
  confidence: 1,
  needs_review: false,
  name: 'Double Trouble',
  brewery: 'Schnitt',
  style: 'Double IPA',
  abv: 8.6,
  taste_fit: 0.9,
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
  vi.useRealTimers()
})

describe('menu-scan-cache', () => {
  it('round-trips a fresh snapshot', () => {
    saveMenuScanCache({
      results: [sampleResult],
      appliedSession: { vibe: 'cozy', abv_intent: 'any', free_text: 'hoppy' },
      addedIds: ['extra'],
      dismissed: ['gone'],
      vibe: 'cozy',
      freeText: 'hoppy',
    })
    const loaded = loadMenuScanCache()
    expect(loaded).not.toBeNull()
    expect(loaded?.results).toEqual([sampleResult])
    expect(loaded?.appliedSession?.vibe).toBe('cozy')
    expect(loaded?.addedIds).toEqual(['extra'])
    expect(loaded?.dismissed).toEqual(['gone'])
    expect(loaded?.vibe).toBe('cozy')
    expect(loaded?.freeText).toBe('hoppy')
  })

  it('expires after the 6h TTL', () => {
    const now = 1_700_000_000_000
    vi.setSystemTime(now)
    saveMenuScanCache({
      savedAt: now,
      results: [sampleResult],
      appliedSession: null,
      addedIds: [],
      dismissed: [],
      vibe: null,
      freeText: '',
    })
    expect(loadMenuScanCache(now + MENU_SCAN_CACHE_TTL_MS - 1)).not.toBeNull()
    expect(loadMenuScanCache(now + MENU_SCAN_CACHE_TTL_MS + 1)).toBeNull()
    expect(localStorage.getItem(MENU_SCAN_CACHE_KEY)).toBeNull()
  })

  it('clears corrupt payloads', () => {
    localStorage.setItem(MENU_SCAN_CACHE_KEY, '{not-json')
    expect(loadMenuScanCache()).toBeNull()
    expect(localStorage.getItem(MENU_SCAN_CACHE_KEY)).toBeNull()

    localStorage.setItem(MENU_SCAN_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), results: 'nope' }))
    expect(loadMenuScanCache()).toBeNull()
    expect(localStorage.getItem(MENU_SCAN_CACHE_KEY)).toBeNull()
  })

  it('clearMenuScanCache removes the key', () => {
    saveMenuScanCache({
      results: [sampleResult],
      appliedSession: null,
      addedIds: [],
      dismissed: [],
      vibe: null,
      freeText: '',
    })
    clearMenuScanCache()
    expect(localStorage.getItem(MENU_SCAN_CACHE_KEY)).toBeNull()
  })
})
