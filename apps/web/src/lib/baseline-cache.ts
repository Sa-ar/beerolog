import type { BaselineTaste } from './baseline-taste'

// ponytail: localStorage read-through cache for the home taste profile so it
// renders instantly while the network revalidates. Swap for a query lib only if
// this caching spreads across screens.
const keyFor = (userId: string) => `beerolog:baseline:${userId}`

export function readBaselineCache(userId: string | null | undefined): BaselineTaste | null {
  if (typeof window === 'undefined' || !userId) return null
  try {
    const raw = localStorage.getItem(keyFor(userId))
    return raw ? (JSON.parse(raw) as BaselineTaste) : null
  } catch {
    return null
  }
}

export function writeBaselineCache(userId: string | null | undefined, baseline: BaselineTaste): void {
  if (typeof window === 'undefined' || !userId) return
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(baseline))
  } catch {
    // best-effort: ignore quota / serialization failures
  }
}

export function clearBaselineCache(userId: string | null | undefined): void {
  if (typeof window === 'undefined' || !userId) return
  try {
    localStorage.removeItem(keyFor(userId))
  } catch {
    // best-effort
  }
}
