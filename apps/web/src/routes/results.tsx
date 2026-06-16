import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { decodeVector } from '../lib/quiz'
import {
  type RecommendationBeer,
  type RecommendationResult,
  recommendBeers,
  saveProfile,
} from '../lib/api'
import { RatingPrompt } from '../components/RatingPrompt'
import { useRequireAuth } from '../lib/require-auth'
import { BEER_METADATA_BY_ID, SOLO_RECOMMENDATION_CATALOG } from '../lib/catalog'
import { filterCatalogByMenuIds, getMenuBeerIds } from '../lib/menu-context'
import type { FlavorVector } from '@beerolog/types'
import { serializeFlavorVector } from '@beerolog/types'

export const Route = createFileRoute("/results")({
  validateSearch: (s: Record<string, unknown>) => ({ v: String(s['v'] ?? '') }),
  component: ResultsPage,
})

const SLOT_LABELS = {
  best: { label: 'Best pick', emoji: '⭐', color: 'border-amber-400 bg-amber-50' },
  backup: { label: 'Backup pick', emoji: '👍', color: 'border-neutral-200 bg-white' },
  adventurous: { label: 'More adventurous', emoji: '🎲', color: 'border-purple-200 bg-purple-50' },
} as const

type SlotName = keyof typeof SLOT_LABELS

type DisplayBeer = RecommendationBeer & {
  abv?: number | undefined
  tags: string[]
}

function toDisplayBeer(beer: RecommendationBeer): DisplayBeer {
  const metadata = BEER_METADATA_BY_ID[beer.id]
  return {
    ...beer,
    abv: metadata?.abv,
    tags: metadata?.tags ?? [],
  }
}

function getResultsRedirect(v: string): string {
  return v ? `/results?v=${encodeURIComponent(v)}` : '/results'
}

function BeerCard({
  beer,
  slot,
  explanation,
}: {
  beer: DisplayBeer
  slot: SlotName
  explanation?: string | undefined
}) {
  const { label, emoji, color } = SLOT_LABELS[slot]

  return (
    <div className={`rounded-2xl border-2 p-5 flex flex-col gap-3 ${color}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          {emoji} {label}
        </span>
      </div>
      <div>
        <h3 className="text-lg font-bold text-neutral-900">{beer.name}</h3>
        <p className="text-sm text-neutral-500">
          {beer.brewery ?? 'Unknown brewery'} · {beer.style.replace('_', ' ')}
          {beer.abv != null ? ` · ${beer.abv}%` : ''}
        </p>
      </div>
      {explanation && (
        <p className="text-sm text-neutral-700">{explanation}</p>
      )}
      {beer.description && (
        <p className="text-sm text-neutral-600 italic">{beer.description}</p>
      )}
      {beer.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {beer.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="rounded-full bg-white/80 border border-neutral-200 px-2 py-0.5 text-xs text-neutral-600">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function ResultsPage() {
  const navigate = useNavigate()
  const { v } = Route.useSearch()
  const { isLoaded, isSignedIn } = useRequireAuth("/results")
  const vector = useMemo(() => decodeVector(v), [v])
  const vectorList = useMemo(() => serializeFlavorVector(vector as FlavorVector), [vector])
  const menuIds = useMemo(() => getMenuBeerIds(), [])
  const menuCatalog = useMemo(
    () => filterCatalogByMenuIds(SOLO_RECOMMENDATION_CATALOG, menuIds),
    [menuIds],
  )
  const [result, setResult] = useState<RecommendationResult | null>(null)
  const [ratingBeer, setRatingBeer] = useState<RecommendationBeer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profileWarning, setProfileWarning] = useState<string | null>(null)
  const [requestKey, setRequestKey] = useState(0)

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      void navigate({
        to: '/signin',
        search: { next: getResultsRedirect(v) },
      })
      return
    }

    if (menuCatalog.length < 3) {
      void navigate({ to: '/menu' })
      return
    }

    let cancelled = false

    async function loadRecommendations() {
      setLoading(true)
      setError(null)
      setProfileWarning(null)

      try {
        try {
          await saveProfile(vectorList)
        } catch (profileError) {
          if (!cancelled) {
            const message =
              profileError instanceof Error
                ? profileError.message
                : 'Could not save your taste profile.'
            setProfileWarning(message)
          }
        }

        const recommendations = await recommendBeers(vectorList, menuCatalog)
        if (!cancelled) {
          setResult(recommendations)
        }
      } catch (recommendError) {
        if (!cancelled) {
          const message =
            recommendError instanceof Error
              ? recommendError.message
              : 'Could not load your recommendations right now.'
          setError(message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadRecommendations()

    return () => {
      cancelled = true
    }
  }, [isLoaded, isSignedIn, menuCatalog, navigate, requestKey, v, vectorList])

  if (!isLoaded || !isSignedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 bg-gradient-to-b from-amber-50 to-white">
        <p className="text-sm text-neutral-400 animate-pulse">Redirecting to sign in…</p>
      </main>
    )
  }

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-b from-amber-50 to-white">
        <p className="text-neutral-400 animate-pulse">Saving your profile and finding your beers…</p>
      </main>
    )
  }

  if (error || !result) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-b from-amber-50 to-white">
        <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-bold text-neutral-900">Couldn't load your picks</h1>
          <p className="mt-2 text-sm text-neutral-500">{error ?? 'Something went wrong while loading your recommendations.'}</p>
          <div className="mt-5 flex flex-col gap-3">
            <button
              onClick={() => setRequestKey((value) => value + 1)}
              className="rounded-xl bg-amber-600 py-3 text-sm font-semibold text-white hover:bg-amber-700"
            >
              Try again
            </button>
            <Link to="/menu">
              <button className="w-full rounded-xl border border-neutral-200 bg-white py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                Back to menu scan
              </button>
            </Link>
            <Link to="/quiz">
              <button className="w-full rounded-xl border border-neutral-200 bg-white py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                Back to quiz
              </button>
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const recommendations = [
    { slot: 'best' as const, beer: result.best },
    { slot: 'backup' as const, beer: result.backup },
    { slot: 'adventurous' as const, beer: result.adventurous },
  ].filter((entry): entry is { slot: SlotName; beer: RecommendationBeer } => entry.beer != null)

  return (
    <>
      <main className="flex min-h-screen flex-col items-center justify-start p-6 pt-10 bg-gradient-to-b from-amber-50 to-white">
        <div className="w-full max-w-sm flex flex-col gap-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-neutral-900">Your beer matches</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Picks from your menu ({menuIds.length} beers) — ranked by the recommendation engine.
            </p>
          </div>

          {profileWarning && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Couldn't save your profile: {profileWarning}. Your picks are still shown below.
            </div>
          )}

          {recommendations.map(({ slot, beer }) => (
            <BeerCard
              key={`${slot}-${beer.id}`}
              beer={toDisplayBeer(beer)}
              slot={slot}
              explanation={result.explanations[beer.id]}
            />
          ))}

          <div className="flex gap-3">
            <Link to="/profile" className="flex-1">
              <button className="w-full rounded-xl bg-amber-600 py-3 text-sm font-semibold text-white hover:bg-amber-700">
                View profile
              </button>
            </Link>
            <Link to="/quiz" className="flex-1">
              <button className="w-full rounded-xl border border-neutral-200 bg-white py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                Retake quiz
              </button>
            </Link>
          </div>

          <button
            onClick={() => setRatingBeer(result.best)}
            className="text-center text-xs text-neutral-400 underline hover:text-neutral-600"
          >
            Rate your top pick →
          </button>
        </div>
      </main>

      {ratingBeer && (
        <RatingPrompt
          beer={ratingBeer}
          onDismiss={() => setRatingBeer(null)}
        />
      )}
    </>
  )
}
