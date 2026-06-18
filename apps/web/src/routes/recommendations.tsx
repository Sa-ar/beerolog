/**
 * /recommendations — beer picks matched to taste profile and session intent.
 */

import { CatalogIcon } from '@beerolog/icons'
import { Alert, Button } from '@beerolog/ui'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { RecommendationBeerCard, type RecommendedBeer } from '../components/RecommendationBeerCard'
import { RecommendationsLoadingState } from '../components/RecommendationsLoadingState'
import { StatusCard } from '../components/StatusCard'
import { DEFAULT_MATCH_CALIBRATION, tonightMatchPercent } from '../lib/match-score'
import { loadMoreErrorMessage, sessionStartErrorMessage } from '../lib/user-facing-errors'
import {
  clearPendingSession,
  hasMoreResultsAvailable,
  loadMoreRecommendations,
  readPendingSession,
  readStoredRecommendations,
  RECS_PAGE_SIZE,
  startSession,
  type StoredSessionRequest,
} from '../lib/session-intent'

export const Route = createFileRoute('/recommendations')({
  component: RecommendationsPage,
})

type PageState =
  | { status: 'loading' }
  | { status: 'ready'; results: RecommendedBeer[]; hasMore: boolean }
  | { status: 'missing' }
  | { status: 'error'; message: string; request: StoredSessionRequest }

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

function RecommendationsPage() {
  const [pageState, setPageState] = useState<PageState>(getInitialPageState)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const pending = readPendingSession()
    if (!pending) return

    let cancelled = false
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
          message: sessionStartErrorMessage(e),
          request: pending,
        })
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
        message: sessionStartErrorMessage(e),
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
      setLoadError(loadMoreErrorMessage(e))
    } finally {
      setLoadingMore(false)
    }
  }

  if (pageState.status === 'loading') {
    return <RecommendationsLoadingState />
  }

  if (pageState.status === 'error') {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:gap-8 sm:px-6 sm:py-10 md:py-12">
        <section className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
            Recommendations
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl md:text-4xl">
            Couldn&apos;t load your picks
          </h1>
        </section>

        <StatusCard
          variant="error"
          title="Couldn't load your picks"
          description={pageState.message}
          illustration={
            <CatalogIcon group="journey" iconKey="picks" className="h-36 w-44 opacity-60" />
          }
          action={
            <div className="flex w-full max-w-xs flex-col gap-3">
              <Button className="w-full" size="lg" onClick={() => void handleRetrySession()}>
                Try again
              </Button>
              <Link to="/" className="w-full">
                <Button className="w-full" size="md" variant="outline">
                  Back to dashboard
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
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:gap-8 sm:px-6 sm:py-10 md:py-12">
        <section className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
            Recommendations
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl md:text-4xl">
            No picks yet
          </h1>
        </section>

        <StatusCard
          variant="empty"
          title="No picks yet"
          description="Pick tonight's vibe and we'll match five beers to how you feel right now."
          illustration={
            <CatalogIcon group="journey" iconKey="picks" className="h-36 w-44" />
          }
          action={
            <Link to="/" className="w-full max-w-xs">
              <Button className="w-full" size="lg">
                Start a session
              </Button>
            </Link>
          }
        />
      </main>
    )
  }

  const { results, hasMore } = pageState
  const stored = readStoredRecommendations()
  const alpha = stored?.alpha ?? 0.4
  const calibration = stored?.calibration ?? DEFAULT_MATCH_CALIBRATION
  const beta = stored?.beta ?? 0.3
  const hasSession = Boolean(stored?.request?.session)
  const abvIntent = stored?.request?.session.abv_intent
  const pickLabel = results.length === 1 ? 'pick' : 'picks'

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:gap-8 sm:px-6 sm:py-10 md:py-12">
      <section className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
          Matched for you
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl md:text-4xl">
          Your top {results.length} {pickLabel}
        </h1>
        <p className="max-w-xl text-sm text-neutral-600 sm:text-base">
          Ranked for your saved taste profile and tonight&apos;s session intent.
        </p>
      </section>

      <div className="flex flex-col gap-3 sm:gap-4">
        {results.map((beer, index) => (
          <RecommendationBeerCard
            key={beer.id}
            beer={beer}
            rank={index + 1}
            matchPercent={tonightMatchPercent(beer.breakdown, hasSession, calibration, beta)}
            alpha={alpha}
            hasSession={hasSession}
            abvIntent={abvIntent}
            calibration={calibration}
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
                {loadingMore ? 'Loading more picks…' : `Show ${RECS_PAGE_SIZE} more picks`}
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  )
}
