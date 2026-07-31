/** Client-side resume cache for the last successful /menu scan.
 *
 * Stores ranked result JSON only (never the photo). TTL is 6 hours — long
 * enough for a night out, short enough that next-day rotating tap boards are
 * not presented as current.
 */

import type { MenuScanResultItem, MenuSessionIntent } from './menu-scan'
import type { SessionVibe } from './session-intent'

export const MENU_SCAN_CACHE_KEY = 'beerolog.menu_scan.v1'
export const MENU_SCAN_CACHE_TTL_MS = 6 * 60 * 60 * 1000

export type MenuScanCacheSnapshot = {
  savedAt: number
  results: MenuScanResultItem[]
  appliedSession: MenuSessionIntent | null
  addedIds: string[]
  dismissed: string[]
  vibe: SessionVibe | null
  freeText: string
}

function isSessionVibe(v: unknown): v is SessionVibe {
  return v === 'refreshing' || v === 'cozy' || v === 'adventurous' || v === 'familiar'
}

function isResultItem(v: unknown): v is MenuScanResultItem {
  if (!v || typeof v !== 'object') return false
  const r = v as Record<string, unknown>
  return typeof r.raw_text === 'string'
}

export function loadMenuScanCache(now = Date.now()): MenuScanCacheSnapshot | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(MENU_SCAN_CACHE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') {
      clearMenuScanCache()
      return null
    }
    const snap = parsed as Record<string, unknown>
    if (typeof snap.savedAt !== 'number' || !Array.isArray(snap.results)) {
      clearMenuScanCache()
      return null
    }
    if (now - snap.savedAt > MENU_SCAN_CACHE_TTL_MS) {
      clearMenuScanCache()
      return null
    }
    if (!snap.results.every(isResultItem)) {
      clearMenuScanCache()
      return null
    }
    let vibe: SessionVibe | null = null
    if (snap.vibe != null) {
      if (!isSessionVibe(snap.vibe)) {
        clearMenuScanCache()
        return null
      }
      vibe = snap.vibe
    }
    return {
      savedAt: snap.savedAt,
      results: snap.results,
      appliedSession: (snap.appliedSession as MenuSessionIntent | null) ?? null,
      addedIds: Array.isArray(snap.addedIds)
        ? snap.addedIds.filter((id): id is string => typeof id === 'string')
        : [],
      dismissed: Array.isArray(snap.dismissed)
        ? snap.dismissed.filter((id): id is string => typeof id === 'string')
        : [],
      vibe,
      freeText: typeof snap.freeText === 'string' ? snap.freeText : '',
    }
  } catch {
    clearMenuScanCache()
    return null
  }
}

export function saveMenuScanCache(
  snapshot: Omit<MenuScanCacheSnapshot, 'savedAt'> & { savedAt?: number },
): void {
  if (typeof localStorage === 'undefined') return
  const payload: MenuScanCacheSnapshot = {
    savedAt: snapshot.savedAt ?? Date.now(),
    results: snapshot.results,
    appliedSession: snapshot.appliedSession,
    addedIds: snapshot.addedIds,
    dismissed: snapshot.dismissed,
    vibe: snapshot.vibe,
    freeText: snapshot.freeText,
  }
  try {
    localStorage.setItem(MENU_SCAN_CACHE_KEY, JSON.stringify(payload))
  } catch {
    // Quota / private mode — scan still works without persistence.
  }
}

export function clearMenuScanCache(): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(MENU_SCAN_CACHE_KEY)
  } catch {
    // ignore
  }
}
