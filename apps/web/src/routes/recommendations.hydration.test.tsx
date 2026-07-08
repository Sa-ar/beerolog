import type React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import i18next from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { describe, expect, it, vi, beforeAll, beforeEach } from 'vitest'
import en from '../i18n/locales/en/common.json'

// Mock the network layer. apiFetch returns a Response-like object with ok,
// status + json(). Each test installs an implementation that routes by path.
const apiFetchMock = vi.fn()
vi.mock('../lib/api-fetch', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...(args as [])),
}))

// TanStack router internals — stub createFileRoute + Link so the page renders.
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (opts: { component: unknown }) => opts,
  Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))

// Clerk's <Show> gates on auth state; force the signed-in branch and stub
// RedirectToSignIn so the signed-out path is inert.
vi.mock('@clerk/tanstack-react-start', () => ({
  Show: ({ when, children }: { when: string; children: React.ReactNode }) =>
    when === 'signed-in' ? <>{children}</> : null,
  RedirectToSignIn: () => null,
}))

import { Route } from './recommendations'
import { GUEST_ANSWERS_KEY } from '../lib/guest-answers'

const RecommendationsPage = (Route as unknown as { component: () => React.ReactElement }).component

const i18n = i18next.createInstance()

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common'],
    resources: { en: { common: en } },
  })
})

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <RecommendationsPage />
      </I18nextProvider>
    </QueryClientProvider>,
  )
}

function recommendationsResponse() {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      results: [
        {
          id: 'b1',
          name: 'Authed Lager',
          name_hebrew: null,
          brewery: 'Acme',
          style: 'lager',
          abv: 5,
          color: 'gold',
          image_url: null,
          why: 'crisp',
          breakdown: {
            baseline_cos: 0.9,
            session_cos: 0,
            baseline_score: 0.9,
            session_score: 0,
            abv_score: 0,
            abv_fits_intent: true,
            novelty_score: 0,
            total_score: 0.9,
            dominant_component: 'baseline',
          },
        },
      ],
      alpha: 0.4,
      beta: 0.3,
      calibration: { cos_floor: 0.5, cos_ceiling: 0.95 },
    }),
  }
}

const GUEST_ANSWERS = { coffee: 'black', water: 'strong', adventure: 'high' }

describe('/recommendations post-signup hydration', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    apiFetchMock.mockReset()
  })

  it('hydrates from guest answers: GET 404 then POST /onboarding then authed recs, clearing answers', async () => {
    localStorage.setItem(GUEST_ANSWERS_KEY, JSON.stringify(GUEST_ANSWERS))

    apiFetchMock.mockImplementation((path: string, init?: { method?: string }) => {
      if (path === '/me/baseline-taste') {
        return Promise.resolve({ ok: false, status: 404, json: async () => ({}) })
      }
      if (path === '/onboarding' && init?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => ({
            user_id: 'u1',
            bubbles: 0.5,
            bitterness: 0.6,
            sweetness: 0.4,
            body: 0.5,
            abv_affinity: 0.5,
            flavor_family: { hoppy: 0.7 },
            novelty_affinity: 0.8,
            model_version: 1,
            embedding_fresh_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          }),
        })
      }
      if (path === '/recommendations' && init?.method === 'POST') {
        return Promise.resolve(recommendationsResponse())
      }
      if (path === '/availability' && init?.method === 'POST') {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ availability: {} }) })
      }
      throw new Error(`unexpected apiFetch ${path}`)
    })

    renderPage()

    await waitFor(() => expect(screen.getByText('Authed Lager')).toBeInTheDocument())

    // Availability is an orthogonal query fired once results render; assert the
    // hydration sequence without it.
    const paths = apiFetchMock.mock.calls
      .map((c) => c[0] as string)
      .filter((p) => p !== '/availability')
    expect(paths).toEqual(['/me/baseline-taste', '/onboarding', '/recommendations'])

    // POST /onboarding carried the stored guest answers.
    const onboardingCall = apiFetchMock.mock.calls.find((c) => c[0] === '/onboarding')
    expect(JSON.parse((onboardingCall?.[1] as { body: string }).body)).toEqual(GUEST_ANSWERS)

    // Guest answers cleared after successful hydration.
    expect(localStorage.getItem(GUEST_ANSWERS_KEY)).toBeNull()
  })

  it('existing profile (GET 200): no POST /onboarding, guest answers cleared', async () => {
    localStorage.setItem(GUEST_ANSWERS_KEY, JSON.stringify(GUEST_ANSWERS))

    apiFetchMock.mockImplementation((path: string) => {
      if (path === '/me/baseline-taste') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ user_id: 'u1', bubbles: 0.5 }),
        })
      }
      throw new Error(`unexpected apiFetch ${path}`)
    })

    renderPage()

    // Stale guest answers are discarded even when nothing else happens.
    await waitFor(() => expect(localStorage.getItem(GUEST_ANSWERS_KEY)).toBeNull())

    const paths = apiFetchMock.mock.calls.map((c) => c[0] as string)
    expect(paths).not.toContain('/onboarding')
  })

  it('no guest answers: no profile GET-triggered onboarding, existing behavior unchanged', async () => {
    // No guest answers in storage. The hydration path must not fire any onboarding.
    apiFetchMock.mockImplementation((path: string) => {
      if (path === '/me/baseline-taste') {
        return Promise.resolve({ ok: false, status: 404, json: async () => ({}) })
      }
      throw new Error(`unexpected apiFetch ${path}`)
    })

    renderPage()

    // Existing empty-state behavior: the "missing" status card renders.
    await waitFor(() =>
      expect(screen.getAllByText(en.recommendations.missingTitle).length).toBeGreaterThan(0),
    )

    const paths = apiFetchMock.mock.calls.map((c) => c[0] as string)
    expect(paths).not.toContain('/onboarding')
  })
})
