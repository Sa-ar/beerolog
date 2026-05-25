import { createRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { Route as rootRoute } from './__root'
import { getGroupRecommendation, getSessionStatus } from '../lib/api'
import type { GroupRecommendation, SessionStatus } from '../lib/api'
import { getRecommendationSlots } from '../lib/scoring'
import { BEER_SEEDS } from '../data/beers'
import type { FlavorVector } from '@beerolog/types'
import { FLAVOR_VECTOR_DIMENSIONS } from '@beerolog/types'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/group/$sessionId/result',
  component: GroupResultPage,
})

function GroupResultPage() {
  const { sessionId } = Route.useParams()
  const [status, setStatus] = useState<SessionStatus | null>(null)
  const [rec, setRec] = useState<GroupRecommendation | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getSessionStatus(sessionId),
      getGroupRecommendation(sessionId),
    ])
      .then(([s, r]) => { setStatus(s); setRec(r) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [sessionId])

  const slots = useMemo(() => {
    if (!rec) return null
    const vector = Object.fromEntries(
      FLAVOR_VECTOR_DIMENSIONS.map((d, i) => [d, rec.group_vector[i] ?? 0.5])
    ) as FlavorVector
    return getRecommendationSlots(vector, BEER_SEEDS)
  }, [rec])

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6">
        <p className="text-neutral-400 animate-pulse">Crunching the group picks…</p>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-6 pt-10 bg-gradient-to-b from-amber-50 to-white">
      <div className="w-full max-w-sm flex flex-col gap-6">

        <div className="text-center">
          <h1 className="text-3xl font-bold text-neutral-900">Group pick</h1>
          {status && (
            <p className="mt-1 text-sm text-neutral-500">
              {status.completed} of {status.total} submitted
            </p>
          )}
        </div>

        {rec?.high_variance && (
          <div className="rounded-2xl bg-yellow-50 border border-yellow-200 p-4">
            <p className="text-sm font-semibold text-yellow-800">⚠️ Conflicting tastes</p>
            <p className="mt-1 text-sm text-yellow-700">Your group has very different preferences. This pick is a compromise — consider ordering a round of different styles.</p>
          </div>
        )}

        {status && status.participants.length > 0 && (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Who's in</p>
            {status.participants.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-neutral-100 bg-white px-4 py-2.5">
                <span className="text-sm text-neutral-800">{p.name}</span>
                <span className={`text-xs font-medium ${p.submitted ? 'text-green-600' : 'text-neutral-400'}`}>
                  {p.submitted ? '✓ submitted' : 'waiting…'}
                </span>
              </div>
            ))}
          </div>
        )}

        {slots && (
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Recommendations</p>
            {[{ beer: slots.best, label: '⭐ Best for the group' }, { beer: slots.backup, label: '👍 Backup' }, { beer: slots.adventurous, label: '🎲 Adventurous pick' }]
              .filter((s): s is { beer: NonNullable<typeof s.beer>; label: string } => s.beer != null)
              .map(({ beer, label }) => (
                <div key={beer.name} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-semibold text-neutral-500">{label}</p>
                  <p className="mt-1 font-bold text-neutral-900">{beer.name}</p>
                  <p className="text-sm text-neutral-500">{beer.brewery} · {beer.style.replace('_', ' ')}</p>
                  {beer.description && <p className="mt-1 text-xs text-neutral-500 italic">{beer.description}</p>}
                </div>
              ))}
          </div>
        )}

        {(!slots || status?.total === 0) && !loading && (
          <p className="text-center text-sm text-neutral-400">No submissions yet — share the link and wait for your group.</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => { setLoading(true); void Promise.all([getSessionStatus(sessionId), getGroupRecommendation(sessionId)]).then(([s, r]) => { setStatus(s); setRec(r) }).finally(() => setLoading(false)) }}
            className="flex-1 rounded-xl border border-neutral-200 bg-white py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            🔄 Refresh
          </button>
          <Link to="/" className="flex-1">
            <button className="w-full rounded-xl border border-neutral-200 bg-white py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
              Home
            </button>
          </Link>
        </div>

      </div>
    </main>
  )
}
