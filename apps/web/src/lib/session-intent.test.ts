import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchBaselineRecommendations,
  loadMoreRecommendations,
  RECS_PAGE_SIZE,
  RECS_STORAGE_KEY,
  type SessionBaseline,
} from './session-intent'

const apiFetchMock = vi.fn()
vi.mock('@beerolog/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@beerolog/shared')>()),
  apiFetch: (...args: unknown[]) => apiFetchMock(...(args as [])),
}))

const BASELINE: SessionBaseline = {
  bubbles: 0.5,
  bitterness: 0.6,
  flavor_family: { hoppy: 0.7, malty: 0.5, roasty: 0.4, fruity: 0.3, sour: 0.2, smoky: 0.1 },
  novelty_affinity: 0.5,
}

function beer(id: string, name: string) {
  return {
    id,
    name,
    name_hebrew: null,
    brewery: 'Acme',
    style: 'lager',
    abv: 5,
    color: 'gold' as const,
    image_url: null,
    why: {
      code: 'baseline',
      params: {},
      facts: [{ code: 'taste_close' }],
    },
    breakdown: {
      baseline_cos: 0.5,
      session_cos: 0,
      baseline_score: 0.5,
      session_score: 0,
      abv_score: 0,
      abv_fits_intent: true,
      novelty_score: 0,
      total_score: 0.5,
      dominant_component: 'baseline',
    },
  }
}

function recsResponse(results: ReturnType<typeof beer>[]) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      results,
      alpha: 0.6,
      beta: 0.3,
      calibration: { cos_floor: 0.2, cos_ceiling: 0.5 },
    }),
  }
}

describe('baseline recommendations + load more', () => {
  beforeEach(() => {
    sessionStorage.clear()
    apiFetchMock.mockReset()
  })

  it('persists a baseline request so load-more can re-query without a tonight session', async () => {
    const page1 = Array.from({ length: RECS_PAGE_SIZE }, (_, i) => beer(`b${i}`, `Beer ${i}`))
    const page2 = [
      ...page1,
      ...Array.from({ length: RECS_PAGE_SIZE }, (_, i) => beer(`b${i + 5}`, `Beer ${i + 5}`)),
    ]

    apiFetchMock
      .mockResolvedValueOnce(recsResponse(page1))
      .mockResolvedValueOnce(recsResponse(page2))

    const first = await fetchBaselineRecommendations(BASELINE)
    expect(first.results).toHaveLength(RECS_PAGE_SIZE)
    expect(first.request).toEqual({ baseline: BASELINE })

    const stored = JSON.parse(sessionStorage.getItem(RECS_STORAGE_KEY) ?? '{}')
    expect(stored.request).toEqual({ baseline: BASELINE })

    const more = await loadMoreRecommendations(first.results)
    expect(more.results).toHaveLength(RECS_PAGE_SIZE * 2)
    expect(more.hasMore).toBe(true)

    const loadMoreInit = apiFetchMock.mock.calls[1]?.[1] as { body: string }
    const loadMoreBody = JSON.parse(loadMoreInit.body)
    expect(loadMoreBody).toEqual({
      baseline: BASELINE,
      top_k: RECS_PAGE_SIZE * 2,
      locale: 'en',
    })
    expect(loadMoreBody.session).toBeUndefined()
  })

  it('fails load-more only when nothing is stored at all', async () => {
    await expect(loadMoreRecommendations([])).rejects.toThrow(/No saved picks/)
  })

  it('discards stored recs that lack match facts so the page re-fetches', async () => {
    const { readStoredRecommendations } = await import('./session-intent')
    sessionStorage.setItem(
      RECS_STORAGE_KEY,
      JSON.stringify({
        results: [{ ...beer('old', 'Old'), why: { code: 'baseline', params: {} } }],
        alpha: 0.6,
        beta: 0.3,
        request: { baseline: BASELINE },
      }),
    )
    expect(readStoredRecommendations()).toBeNull()
    expect(sessionStorage.getItem(RECS_STORAGE_KEY)).toBeNull()
  })
})
