import { createRoute, Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { Route as rootRoute } from './__root'
import { decodeVector } from '../lib/quiz'
import { getRecommendationSlots, type ScoredBeer } from '../lib/scoring'
import { RatingPrompt } from '../components/RatingPrompt'
import { FLAVOR_VECTOR_DIMENSIONS } from '@beerolog/types'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/results',
  validateSearch: (s: Record<string, unknown>) => ({ v: String(s['v'] ?? '') }),
  component: ResultsPage,
})

const SLOT_LABELS = {
  best: { label: 'Best pick', emoji: '⭐', color: 'border-amber-400 bg-amber-50' },
  backup: { label: 'Backup pick', emoji: '👍', color: 'border-neutral-200 bg-white' },
  adventurous: { label: 'More adventurous', emoji: '🎲', color: 'border-purple-200 bg-purple-50' },
} as const

function BeerCard({
  beer,
  slot,
  excluded,
  onSkip,
}: {
  beer: ScoredBeer
  slot: keyof typeof SLOT_LABELS
  excluded: string[]
  onSkip?: () => void
}) {
  const { label, emoji, color } = SLOT_LABELS[slot]
  return (
    <div className={`rounded-2xl border-2 p-5 flex flex-col gap-3 ${color}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          {emoji} {label}
        </span>
        <span className="text-xs text-neutral-400">{Math.round(beer.score * 100)}% match</span>
      </div>
      <div>
        <h3 className="text-lg font-bold text-neutral-900">{beer.name}</h3>
        <p className="text-sm text-neutral-500">{beer.brewery} · {beer.style.replace('_', ' ')} · {beer.abv}%</p>
      </div>
      {beer.description && (
        <p className="text-sm text-neutral-600 italic">{beer.description}</p>
      )}
      <div className="flex flex-wrap gap-1">
        {beer.tags.slice(0, 4).map((tag) => (
          <span key={tag} className="rounded-full bg-white/80 border border-neutral-200 px-2 py-0.5 text-xs text-neutral-600">
            {tag}
          </span>
        ))}
      </div>
      {onSkip && (
        <button
          onClick={onSkip}
          className="mt-1 text-xs text-neutral-400 underline self-start hover:text-neutral-600"
        >
          Show me another option
        </button>
      )}
    </div>
  )
}

function ResultsPage() {
  const { v } = Route.useSearch()
  const vector = useMemo(() => decodeVector(v), [v])
  const [excluded, setExcluded] = useState<string[]>([])
  const [ratingBeer, setRatingBeer] = useState<ScoredBeer | null>(null)

  const { best, backup, adventurous } = useMemo(
    () => getRecommendationSlots(vector, undefined, excluded),
    [vector, excluded],
  )

  return (
    <>
    <main className="flex min-h-screen flex-col items-center justify-start p-6 pt-10 bg-gradient-to-b from-amber-50 to-white">
      <div className="w-full max-w-sm flex flex-col gap-6">

        <div className="text-center">
          <h1 className="text-3xl font-bold text-neutral-900">Your beer matches</h1>
          <p className="mt-1 text-sm text-neutral-500">Based on your taste profile</p>
        </div>

        <BeerCard
          beer={best}
          slot="best"
          excluded={excluded}
          onSkip={() => setExcluded((e) => [...e, best.name])}
        />

        {backup && (
          <BeerCard beer={backup} slot="backup" excluded={excluded} />
        )}

        {adventurous && adventurous.name !== best.name && adventurous.name !== backup?.name && (
          <BeerCard beer={adventurous} slot="adventurous" excluded={excluded} />
        )}

        <div className="flex gap-3">
          <Link to="/quiz" className="flex-1">
            <button className="w-full rounded-xl border border-neutral-200 bg-white py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
              Retake quiz
            </button>
          </Link>
          <Link to="/" className="flex-1">
            <button className="w-full rounded-xl border border-neutral-200 bg-white py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
              Home
            </button>
          </Link>
        </div>

        <button
          onClick={() => setRatingBeer(best)}
          className="text-center text-xs text-neutral-400 underline hover:text-neutral-600"
        >
          Rate your beer →
        </button>

      </div>
    </main>

    {ratingBeer && (
      <RatingPrompt
        beer={{
          id: ratingBeer.name,
          name: ratingBeer.name,
          style: ratingBeer.style,
          flavor_vector: FLAVOR_VECTOR_DIMENSIONS.map((d) => ratingBeer.fv[FLAVOR_VECTOR_DIMENSIONS.indexOf(d)] ?? 0.5),
        }}
        onDismiss={() => setRatingBeer(null)}
      />
    )}
    </>
  )
}
