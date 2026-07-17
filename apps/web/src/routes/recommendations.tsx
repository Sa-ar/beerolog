/**
 * /recommendations — beer picks matched to taste profile and session intent.
 */

import { RedirectToSignIn, Show } from '@clerk/tanstack-react-start'
import { CatalogIcon } from '@beerolog/icons'
import { Alert, Button, Heading } from '@beerolog/ui'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RecommendationBeerCard, type RecommendedBeer } from '../components/RecommendationBeerCard'
import { RecommendationsLoadingState } from '../components/RecommendationsLoadingState'
import { StatusCard } from '../components/StatusCard'
import { apiFetch } from '../lib/api-fetch'
import { fetchAvailability } from '../lib/beer-availability'
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

// Cached recommendations payload plus the derived "can load more" flag.
// null = nothing to show (the missing/empty state).
type RecsData = (RecommendationsPayload & { hasMore: boolean }) | null

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

// Baseline picks from the signed-in user's persisted taste profile. This is the
// returning-user path: no session, no guest answers, empty sessionStorage still
// yields picks. 404 (no profile yet) is the one genuine empty state -> null.
async function baselineRecommendationsFromProfile(): Promise<RecommendationsPayload | null> {
  const res = await apiFetch('/me/baseline-taste')
  if (!res.ok) return null
  const record = (await res.json()) as BaselineTasteRecord
  return fetchBaselineRecommendations(baselineFromRecord(record))
}

// Resolve the initial recommendations: a pending session-start (from the
// dashboard) wins, else post-signup guest-answer hydration, else whatever is
// already stored, else baseline picks from the saved profile. A failed session
// or hydration degrades to baseline picks rather than a dead-end, so "started a
// session, got nothing" still lands the user on picks. Only a missing profile
// (404) yields the empty state; a genuine outage propagates to the error state.
async function resolveInitialRecommendations(
  pendingRequest: StoredSessionRequest | null,
): Promise<RecsData> {
  const withHasMore = (payload: RecommendationsPayload): RecsData => ({
    ...payload,
    hasMore: hasMoreResultsAvailable(payload.results.length),
  })

  if (pendingRequest) {
    try {
      return withHasMore(await startSession(pendingRequest.baseline, pendingRequest.session))
    } catch {
      // Session start failed — fall through to baseline picks below.
    }
  }

  if (readGuestAnswers()) {
    try {
      const payload = await hydrateGuestAnswers()
      if (payload) return withHasMore(payload)
    } catch {
      // Fall back to stored/baseline/missing below.
    }
  }

  const stored = readStoredRecommendations()
  if (stored && stored.results.length > 0) return withHasMore(stored)

  const baseline = await baselineRecommendationsFromProfile()
  return baseline ? withHasMore(baseline) : null
}

function RecommendationsContent() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  // Consume a pending session-start once; the captured value drives both the
  // initial query and retries (refetch), while sessionStorage is cleared so a
  // page revisit doesn't re-run it.
  const [pendingRequest] = useState<StoredSessionRequest | null>(() => {
    const p = readPendingSession()
    if (p) clearPendingSession()
    return p
  })
  const recs = useQuery<RecsData, Error>({
    queryKey: ['recommendations'],
    queryFn: () => resolveInitialRecommendations(pendingRequest),
    // Paint stored recs instantly unless we have a session to start or guest
    // answers to hydrate — those show the loading state while their query runs.
    initialData: (): RecsData | undefined => {
      if (pendingRequest || readGuestAnswers()) return undefined
      const stored = readStoredRecommendations()
      return stored && stored.results.length > 0
        ? { ...stored, hasMore: hasMoreResultsAvailable(stored.results.length) }
        : undefined
    },
    initialDataUpdatedAt: 0,
    // Session-start / hydration are one-shot; retry is explicit via refetch().
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  })

  const loadMore = useMutation<
    { results: RecommendedBeer[]; hasMore: boolean },
    Error,
    RecommendedBeer[]
  >({
    mutationFn: (current) => loadMoreRecommendations(current),
    onSuccess: ({ results, hasMore }) => {
      queryClient.setQueryData<RecsData>(['recommendations'], (prev) =>
        prev ? { ...prev, results, hasMore } : prev,
      )
    },
  })

  const [searchArea, setSearchArea] = useState(() => {
    try {
      return localStorage.getItem('beerolog.searchArea') ?? ''
    } catch {
      return ''
    }
  })
  const [nearMeOnly, setNearMeOnly] = useState(false)

  // Debounce the area filter so typing doesn't refetch on every keystroke. This
  // effect only derives a value — the fetch itself is a react-query query below.
  const [debouncedArea, setDebouncedArea] = useState(searchArea)
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedArea(searchArea), 300)
    return () => clearTimeout(handle)
  }, [searchArea])

  const shownIds = recs.data?.results.map((b) => b.id) ?? []
  // "Available at" venues for the shown beers. fetchAvailability resolves to {}
  // on failure, so cards fall back to the maps link. placeholderData keeps the
  // previous map visible while a new area refetches.
  const availabilityQuery = useQuery({
    queryKey: ['availability', shownIds, debouncedArea],
    enabled: shownIds.length > 0,
    queryFn: () => fetchAvailability(shownIds, debouncedArea),
    placeholderData: (prev) => prev,
  })
  const availability = availabilityQuery.data ?? {}
  const availabilityLoaded = availabilityQuery.isSuccess

  const loadError = loadMore.isError ? loadMoreErrorMessage(t, loadMore.error) : null

  if (recs.isPending) {
    return <RecommendationsLoadingState />
  }

  if (recs.isError) {
    return (
      <main
        className={`${PAGE_SHELL_X} flex flex-1 flex-col gap-6 py-8 sm:gap-8 sm:py-10 md:py-12`}
      >
        <section className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
            {t('recommendations.eyebrow')}
          </p>
          <Heading className="text-2xl sm:text-3xl md:text-4xl">
            {t('recommendations.errorTitle')}
          </Heading>
        </section>

        <StatusCard
          variant="error"
          title={t('recommendations.errorTitle')}
          description={sessionStartErrorMessage(t, recs.error)}
          illustration={
            <CatalogIcon group="journey" iconKey="picks" className="h-36 w-44 opacity-60" />
          }
          action={
            <div className="flex w-full max-w-xs flex-col gap-3">
              <Button className="w-full" size="lg" onClick={() => void recs.refetch()}>
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

  if (!recs.data) {
    return (
      <main
        className={`${PAGE_SHELL_X} flex flex-1 flex-col gap-6 py-8 sm:gap-8 sm:py-10 md:py-12`}
      >
        <section className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
            {t('recommendations.eyebrow')}
          </p>
          <Heading className="text-2xl sm:text-3xl md:text-4xl">
            {t('recommendations.missingTitle')}
          </Heading>
        </section>

        <StatusCard
          variant="empty"
          title={t('recommendations.missingTitle')}
          description={t('recommendations.missingDescription')}
          illustration={<CatalogIcon group="journey" iconKey="picks" className="h-36 w-44" />}
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

  const { results, hasMore } = recs.data
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
        <Heading className="text-2xl sm:text-3xl md:text-4xl">
          {t('recommendations.heading', { count: shownResults.length })}
        </Heading>
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
            venues={availability[beer.id]}
          />
        ))}
      </div>

      {hasMore || loadError ? (
        <section className="border-t border-neutral-200 pt-8 pb-2">
          {loadError ? (
            <Alert className="mb-4" variant="error" onRetry={() => loadMore.mutate(results)}>
              {loadError}
            </Alert>
          ) : null}
          {hasMore ? (
            <div className="flex justify-center px-1 sm:px-0">
              <Button
                size="lg"
                disabled={loadMore.isPending}
                onClick={() => loadMore.mutate(results)}
                className="w-full max-w-md rounded-xl px-8 shadow-sm"
              >
                {loadMore.isPending
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
