/**
 * Guest preview persistence + fetch. The public /try quiz stores its answers in
 * localStorage so a returning guest can jump straight back to results, and calls
 * the public POST /guest-recommendations endpoint (Slice 2) which runs without
 * auth or OpenAI. The response type is hand-mirrored from the API contract
 * (GuestRecommendationsResponse) on purpose — we do NOT couple the public guest
 * surface to the generated authed api-client schema.
 */

import { apiFetch } from './api-fetch'
import { type Answers } from './onboarding-quiz'

export const GUEST_ANSWERS_KEY = 'beerolog:guest_answers'

// Mirror of apps/api/app/api_contracts.py :: GuestRecommendedBeer.
export type GuestRecommendedBeer = {
  id: string
  name: string
  name_hebrew?: string | null
  brewery: string
  style: string
  abv: number
  color: 'pale' | 'gold' | 'amber' | 'brown' | 'dark'
  image_url?: string | null
  match_percent: number
  why: string
}

// Mirror of GuestRecommendationsResponse.
export type GuestRecommendationsResponse = {
  results: GuestRecommendedBeer[]
  unlocked_count: number
}

function hasStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function readGuestAnswers(): Answers | null {
  if (!hasStorage()) return null
  try {
    const raw = window.localStorage.getItem(GUEST_ANSWERS_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Answers
  } catch {
    return null
  }
}

export function writeGuestAnswers(answers: Answers): void {
  if (!hasStorage()) return
  try {
    window.localStorage.setItem(GUEST_ANSWERS_KEY, JSON.stringify(answers))
  } catch {
    // Storage may be full or blocked; the guest flow still works without it.
  }
}

export function clearGuestAnswers(): void {
  if (!hasStorage()) return
  try {
    window.localStorage.removeItem(GUEST_ANSWERS_KEY)
  } catch {
    // ignore
  }
}

export async function fetchGuestRecommendations(
  answers: Answers,
): Promise<GuestRecommendationsResponse> {
  const res = await apiFetch('/guest-recommendations', {
    method: 'POST',
    body: JSON.stringify(answers),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as GuestRecommendationsResponse
}
