/**
 * /recommendations — beer picks matched to taste profile and session intent.
 */

import { RedirectToSignIn, Show } from '@clerk/tanstack-react-start'
import { CatalogIcon } from '@beerolog/icons'
import { Alert, Button } from '@beerolog/ui'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RecommendationBeerCard, type RecommendedBeer } from '../components/RecommendationBeerCard'
import { RecommendationsLoadingState } from '../components/RecommendationsLoadingState'
import { StatusCard } from '../components/StatusCard'
import { apiFetch } from '../lib/api-fetch'
import { fetchAvailability, type Venue } from '../lib/beer-availability'
import { filterByAvailability } from '../lib/near-me-filter'
import { clearGuestAnswers, readGuestAnswers } from '../lib/guest-answers'
import { DEFAULT_MATCH_CALIBRATION, tonightMatchPercent } from '../lib/match-score'
import { prunedAnswers } from '../lib/onboarding-quiz'
import { PAGE_SHELL_X } from '../lib/page-shell'
import { loadMoreErrorMessage, sessionStartErrorMessage } from '../lib/user-facing-errors'
import {
  clearPendingSession,
  fetchBaselineRecommendations,
  hasMoreResultsAvailable,
  loadMoreRecommendations,
  readPendingSession,
  readStoredRecommendations,
  type RecommendationsPayload,
  RECS_PAGE_SIZE,
  type SessionBaseline,
  startSession,
  type StoredSessionRequest,
} from '../lib/session-intent'

export const Route = createFileRoute('/recommendations')({
  component: RecommendationsPage,
})

function RecommendationsPage() {
  return (
    <>
      <Show when="signed-out">
        <RedirectToSignIn />
      </Show>
      <Show when="signed-in">
        <RecommendationsContent />
      </Show>
    </>
  )
}

type PageState =
  | { status: 'loading' }
  | { status: 'ready'; results: RecommendedBeer[]; hasMore: boolean }
  | { status: 'missing' }
  | { status: 'error'; message: string; request: StoredSessionRequest }

// Subset of BaselineTasteRecord (api_contracts) needed to build a baseline-only
// recommendations request. Hand-mirrored — we don't couple to the generated client.
type BaselineTasteRecord = {
  bubbles: number
  bitterness: number
  flavor_family: Record<string, number>
  novelty_affinity: number
}

function baselineFromRecord(record: BaselineTasteRecord): SessionBaseline {
  return {
    bubbles: record.bubbles,
    bitterness: record.bitterness,
    flavor_family: record.flavor_family,
    novelty_affinity: record.novelty_affinity,
  }
}

/**
 * Post-signup hydration: turn stored guest quiz answers into a full authed
 * profile so the user never retakes the quiz. Returns baseline recommendations
 * when freshly hydrated, or null when nothing to hydrate (caller falls back to
 * its normal flow). Always discards stored guest answers once auth is known.
 */
async function hydrateGuestAnswers(): Promise<RecommendationsPayload | null> {
  const profileRes = await apiFetch('/me/baseline-taste')

  // Existing profile (returning user): discard any stale guest answers, no POST.
  if (profileRes.ok) {
    clearGuestAnswers()
    return null
  }

  // Only an explicit "no profile yet" justifies onboarding; other errors bubble
  // so the page can surface them rather than silently re-onboarding.
  if (profileRes.status !== 404) {
    throw new Error(`HTTP ${profileRes.status}`)
  }

  const answers = readGuestAnswers()
  if (!answers) return null

  const onboardingRes = await apiFetch('/onboarding', {
    method: 'POST',
    body: JSON.stringify(prunedAnswers(answers)),
  })
  if (!onboardingRes.ok) throw new Error(`HTTP ${onboardingRes.status}`)
  const record = (await onboardingRes.json()) as BaselineTasteRecord

  const payload = await fetchBaselineRecommendations(baselineFromRecord(record))
  clearGuestAnswers()
  return payload
}

function getInitialPageState(): PageState {
  if (readPendingSession()) {
    return { status: 'loading' }
  }

  const stored = readStoredRecommendations()
  if (stored && stored.results.length > 0) {
    return {
      status: 'ready',
      results: stored.results,
      hasMore: hasMoreResultsAvailable(stored.results.length),
    }
  }

  return { status: 'missing' }
}

function RecommendationsContent() {
  const { t } = useTranslation()
  const [pageState, setPageState] = useState<PageState>(getInitialPageState)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searchArea, setSearchArea] = useState(() => {
    try {
      return localStorage.getItem('beerolog.searchArea') ?? ''
    } catch {
      return ''
    }
  })
  const [loadError, setLoadError] = useState<string | null>(null)
  const [availability, setAvailability] = useState<Record<string, Venue[]>>({})
  const [availabilityLoaded, setAvailabilityLoaded] = useState(false)
  const [nearMeOnly, setNearMeOnly] = useState(false)

  // Fetch "available at" venues for the shown beers, re-running (debounced) when
  // the area filter changes. Failures resolve to {} so cards fall back to the
  // maps link.
  useEffect(() => {
    if (pageState.status !== 'ready') return
    const ids = pageState.results.map((b) => b.id)
    let cancelled = false
    const handle = setTimeout(() => {
      void fetchAvailability(ids, searchArea).then((map) => {
        if (!cancelled) {
          setAvailability(map)
          setAvailabilityLoaded(true)
        }
      })
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [pageState, searchArea])

  useEffect(() => {
    const pending = readPendingSession()
    let cancelled = false

    // An in-flight session-start (from the dashboard) takes precedence and keeps
    // its existing flow untouched.
    if (pending) {
      void (async () => {
        try {
          const data = await startSession(pending.baseline, pending.session)
          if (cancelled) return
          clearPendingSession()
          setPageState({
            status: 'ready',
            results: data.results,
            hasMore: hasMoreResultsAvailable(data.results.length),
          })
        } catch (e) {
          if (cancelled) return
          clearPendingSession()
          setPageState({
            status: 'error',
            message: sessionStartErrorMessage(t, e),
            request: pending,
          })
        }
      })()
      return () => {
        cancelled = true
      }
    }

    // No guest answers stored → nothing to hydrate; keep today's behavior exactly
    // (renders stored recs or the missing/empty state), no extra profile fetch.
    if (!readGuestAnswers()) {
      return () => {
        cancelled = true
      }
    }

    // Guest answers present → attempt post-signup hydration (guest answers → full
    // profile). Decoupled from the CTA: runs however the signed-in user got here.
    setPageState({ status: 'loading' })
    void (async () => {
      let payload: RecommendationsPayload | null = null
      try {
        payload = await hydrateGuestAnswers()
      } catch {
        // Hydration failed (network/onboarding error) — fall back to whatever the
        // normal flow shows (stored recs or the missing/empty state).
      }
      if (cancelled) return
      if (payload) {
        setPageState({
          status: 'ready',
          results: payload.results,
          hasMore: hasMoreResultsAvailable(payload.results.length),
        })
      } else {
        setPageState(getInitialPageState())
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleRetrySession() {
    if (pageState.status !== 'error') return
    const { request } = pageState
    setPageState({ status: 'loading' })
    try {
      const data = await startSession(request.baseline, request.session)
      clearPendingSession()
      setPageState({
        status: 'ready',
        results: data.results,
        hasMore: hasMoreResultsAvailable(data.results.length),
      })
    } catch (e) {
      clearPendingSession()
      setPageState({
        status: 'error',
        message: sessionStartErrorMessage(t, e),
        request,
      })
    }
  }

  async function handleLoadMore() {
    if (pageState.status !== 'ready') return
    setLoadingMore(true)
    setLoadError(null)
    try {
      const { results: merged, hasMore: moreAvailable } = await loadMoreRecommendations(
        pageState.results,
      )
      setPageState({ status: 'ready', results: merged, hasMore: moreAvailable })
    } catch (e) {
      setLoadError(loadMoreErrorMessage(t, e))
    } finally {
      setLoadingMore(false)
    }
  }

  if (pageState.status === 'loading') {
    return <RecommendationsLoadingState />
  }

  if (pageState.status === 'error') {
    return (
      <main className={`${PAGE_SHELL_X} flex flex-1 flex-col gap-6 py-8 sm:gap-8 sm:py-10 md:py-12`}>
        <section className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
            {t('recommendations.eyebrow')}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl md:text-4xl">
            {t('recommendations.errorTitle')}
          </h1>
        </section>

        <StatusCard
          variant="error"
          title={t('recommendations.errorTitle')}
          description={pageState.message}
          illustration={
            <CatalogIcon group="journey" iconKey="picks" className="h-36 w-44 opacity-60" />
          }
          action={
            <div className="flex w-full max-w-xs flex-col gap-3">
              <Button className="w-full" size="lg" onClick={() => void handleRetrySession()}>
                {t('common.tryAgain')}
              </Button>
              <Link to="/" className="w-full">
                <Button className="w-full" size="md" variant="outline">
                  {t('recommendations.backToDashboard')}
                </Button>
              </Link>
            </div>
          }
        />
      </main>
    )
  }

  if (pageState.status === 'missing') {
    return (
      <main className={`${PAGE_SHELL_X} flex flex-1 flex-col gap-6 py-8 sm:gap-8 sm:py-10 md:py-12`}>
        <section className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
            {t('recommendations.eyebrow')}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl md:text-4xl">
            {t('recommendations.missingTitle')}
          </h1>
        </section>

        <StatusCard
          variant="empty"
          title={t('recommendations.missingTitle')}
          description={t('recommendations.missingDescription')}
          illustration={
            <CatalogIcon group="journey" iconKey="picks" className="h-36 w-44" />
          }
          action={
            <Link to="/" className="w-full max-w-xs">
              <Button className="w-full" size="lg">
                {t('recommendations.startSession')}
              </Button>
            </Link>
          }
        />
      </main>
    )
  }

  const { results, hasMore } = pageState
  // Only apply the near-me filter once availability has actually loaded;
  // otherwise the in-flight `{}` would strip every beer and flash a false
  // empty-state while the (debounced) fetch is still running.
  const { beers: shownResults, empty: nearMeEmpty } = filterByAvailability(
    results,
    availability,
    nearMeOnly && availabilityLoaded,
  )
  const stored = readStoredRecommendations()
  const alpha = stored?.alpha ?? 0.4
  const calibration = stored?.calibration ?? DEFAULT_MATCH_CALIBRATION
  const beta = stored?.beta ?? 0.3
  const hasSession = Boolean(stored?.request?.session)
  const abvIntent = stored?.request?.session.abv_intent

  return (
    <main className={`${PAGE_SHELL_X} flex flex-1 flex-col gap-6 py-8 sm:gap-8 sm:py-10 md:py-12`}>
      <section className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
          {t('recommendations.matchedEyebrow')}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl md:text-4xl">
          {t('recommendations.heading', { count: shownResults.length })}
        </h1>
        <p className="max-w-xl text-sm text-neutral-600 sm:text-base">
          {t('recommendations.subhead')}
        </p>
      </section>

      <section className="flex flex-col gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50/60 p-3 sm:p-4">
        <label htmlFor="search-area" className="text-sm font-medium text-neutral-700">
          {t('recommendations.findNearby.areaLabel')}
        </label>
        <input
          id="search-area"
          type="text"
          value={searchArea}
          onChange={(e) => {
            setSearchArea(e.target.value)
            try {
              localStorage.setItem('beerolog.searchArea', e.target.value)
            } catch {
              /* ignore storage failures */
            }
          }}
          placeholder={t('recommendations.findNearby.areaPlaceholder')}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
        />
        <p className="text-xs text-neutral-500">{t('recommendations.findNearby.areaHint')}</p>
        <label className="mt-1 flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={nearMeOnly}
            onChange={(e) => setNearMeOnly(e.target.checked)}
          />
          {t('recommendations.findNearby.nearMeToggle')}
        </label>
      </section>

      {nearMeEmpty ? (
        <p className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4 text-sm text-neutral-600">
          {t('recommendations.findNearby.nearMeEmpty')}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:gap-4">
        {shownResults.map((beer, index) => (
          <RecommendationBeerCard
            key={beer.id}
            beer={beer}
            rank={index + 1}
            matchPercent={tonightMatchPercent(beer.breakdown, hasSession, calibration, beta)}
            alpha={alpha}
            hasSession={hasSession}
            abvIntent={abvIntent}
            calibration={calibration}
            searchArea={searchArea}
            venues={availability[beer.id]}
          />
        ))}
      </div>

      {hasMore || loadError ? (
        <section className="border-t border-neutral-200 pt-8 pb-2">
          {loadError ? (
            <Alert className="mb-4" variant="error" onRetry={() => void handleLoadMore()}>
              {loadError}
            </Alert>
          ) : null}
          {hasMore ? (
            <div className="flex justify-center px-1 sm:px-0">
              <Button
                size="lg"
                disabled={loadingMore}
                onClick={() => void handleLoadMore()}
                className="w-full max-w-md rounded-xl px-8 shadow-sm"
              >
                {loadingMore
                  ? t('recommendations.loadingMore')
                  : t('recommendations.showMore', { count: RECS_PAGE_SIZE })}
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  )
}
