import { apiFetch } from './api-fetch'
import { DEFAULT_MATCH_CALIBRATION, normalizeRecommendedBeer, type MatchCalibration } from './match-score'
import type { RecommendedBeer } from '../components/RecommendationBeerCard'

export type SessionVibe = 'refreshing' | 'cozy' | 'adventurous' | 'familiar'
export type AbvIntent = 'low' | 'medium' | 'high' | 'any'

export type SessionBaseline = {
  bubbles: number
  bitterness: number
  flavor_family: Record<string, number>
  novelty_affinity: number
}

export type SessionRequest = {
  vibe: SessionVibe
  abv_intent: AbvIntent
  free_text?: string
}

export type StoredSessionRequest = {
  baseline: SessionBaseline
  session: SessionRequest
}

export type RecommendationsPayload = {
  results: RecommendedBeer[]
  alpha: number
  beta: number
  calibration?: MatchCalibration
  request?: StoredSessionRequest
}

export const RECS_PAGE_SIZE = 5
export const RECS_STORAGE_KEY = 'beerolog_last_recs'
export const RECS_PENDING_KEY = 'beerolog_pending_session'
const RECS_REQUEST_KEY = 'beerolog_last_recs_request'

// Values only; labels/hints come from enums.vibe.<value>.{label,hint} translation keys.
export const VIBE_OPTIONS: SessionVibe[] = ['refreshing', 'cozy', 'adventurous', 'familiar']

export const ABV_OPTIONS: AbvIntent[] = ['low', 'medium', 'high', 'any']

function persistSessionResults(
  request: StoredSessionRequest,
  data: Omit<RecommendationsPayload, 'request'>,
): void {
  const payload: RecommendationsPayload = {
    ...data,
    results: data.results.map(normalizeRecommendedBeer),
    request,
  }
  sessionStorage.setItem(RECS_STORAGE_KEY, JSON.stringify(payload))
  sessionStorage.setItem(RECS_REQUEST_KEY, JSON.stringify(request))
}

function readLegacyRequest(): StoredSessionRequest | null {
  const raw = sessionStorage.getItem(RECS_REQUEST_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredSessionRequest
  } catch {
    return null
  }
}

export function readStoredRecommendations(): RecommendationsPayload | null {
  const raw = sessionStorage.getItem(RECS_STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as RecommendationsPayload
    const request = parsed.request ?? readLegacyRequest() ?? undefined
    const results = (parsed.results ?? []).map(normalizeRecommendedBeer)

    const payload: RecommendationsPayload = {
      alpha: parsed.alpha ?? 0.4,
      beta: parsed.beta ?? 0.3,
      calibration: parsed.calibration ?? DEFAULT_MATCH_CALIBRATION,
      results,
      ...(request ? { request } : {}),
    }

    if (request && !parsed.request) {
      sessionStorage.setItem(RECS_STORAGE_KEY, JSON.stringify(payload))
    }

    return payload
  } catch {
    return null
  }
}

export function hasMoreResultsAvailable(resultCount: number): boolean {
  return resultCount > 0 && resultCount % RECS_PAGE_SIZE === 0
}

export function markSessionPending(request: StoredSessionRequest): void {
  sessionStorage.removeItem(RECS_STORAGE_KEY)
  sessionStorage.setItem(RECS_PENDING_KEY, JSON.stringify(request))
}

export function readPendingSession(): StoredSessionRequest | null {
  const raw = sessionStorage.getItem(RECS_PENDING_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredSessionRequest
  } catch {
    return null
  }
}

export function clearPendingSession(): void {
  sessionStorage.removeItem(RECS_PENDING_KEY)
}

function resolveSessionRequest(stored: RecommendationsPayload): StoredSessionRequest {
  if (stored.request) return stored.request

  const legacy = readLegacyRequest()
  if (legacy) return legacy

  throw new Error('Start a new session from your dashboard to load more picks.')
}

// Baseline-only fetch (no tonight session intent) — used by post-signup
// hydration on /recommendations. Persists results the same way startSession
// does so the existing render + load-more flow picks them up unchanged.
export async function fetchBaselineRecommendations(
  baseline: SessionBaseline,
): Promise<RecommendationsPayload> {
  const res = await apiFetch('/recommendations', {
    method: 'POST',
    body: JSON.stringify({ baseline, top_k: RECS_PAGE_SIZE }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = (await res.json()) as Omit<RecommendationsPayload, 'request'>
  const results = data.results.map(normalizeRecommendedBeer)
  sessionStorage.setItem(
    RECS_STORAGE_KEY,
    JSON.stringify({ ...data, results } satisfies RecommendationsPayload),
  )
  return { ...data, results }
}

export async function startSession(
  baseline: SessionBaseline,
  session: SessionRequest,
): Promise<RecommendationsPayload> {
  const sessionBody = { ...session, free_text: session.free_text ?? '' }
  const request: StoredSessionRequest = { baseline, session: sessionBody }
  const res = await apiFetch('/recommendations', {
    method: 'POST',
    body: JSON.stringify({
      baseline,
      session: sessionBody,
      top_k: RECS_PAGE_SIZE,
    }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = (await res.json()) as Omit<RecommendationsPayload, 'request'>
  const results = data.results.map(normalizeRecommendedBeer)
  persistSessionResults(request, { ...data, results })
  return { ...data, results, request }
}

export async function loadMoreRecommendations(
  currentResults: RecommendedBeer[],
): Promise<{ results: RecommendedBeer[]; hasMore: boolean }> {
  const stored = readStoredRecommendations()
  if (!stored) {
    throw new Error('No saved picks — start a new session first.')
  }

  const request = resolveSessionRequest(stored)
  const nextTopK = currentResults.length + RECS_PAGE_SIZE

  const res = await apiFetch('/recommendations', {
    method: 'POST',
    body: JSON.stringify({
      baseline: request.baseline,
      session: { ...request.session, free_text: request.session.free_text ?? '' },
      top_k: nextTopK,
    }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const data = (await res.json()) as Omit<RecommendationsPayload, 'request'>
  const normalized = data.results.map(normalizeRecommendedBeer)
  const appended = normalized.slice(currentResults.length)
  const merged = [...currentResults, ...appended]

  persistSessionResults(request, { ...data, results: merged })

  return {
    results: merged,
    hasMore: appended.length === RECS_PAGE_SIZE,
  }
}
