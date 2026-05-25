import { createRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Route as rootRoute } from './__root'
import { resolveQRToken } from '../lib/api'
import { BEER_SEEDS } from '../data/beers'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/scan/$token',
  component: ScanLandingPage,
})

function ScanLandingPage() {
  const { token } = Route.useParams()

  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ok'; venueId: string; beerIds: string[] }
  >({ status: 'loading' })

  useEffect(() => {
    resolveQRToken(token)
      .then((r) => setState({ status: 'ok', venueId: r.venue_id, beerIds: r.beer_ids }))
      .catch(() => setState({ status: 'error', message: 'This QR code has expired or is invalid.' }))
  }, [token])

  if (state.status === 'loading') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6">
        <p className="text-neutral-400 animate-pulse">Loading…</p>
      </main>
    )
  }

  if (state.status === 'error') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <p className="text-2xl">😕</p>
        <p className="text-neutral-600 text-center">{state.message}</p>
        <Link to="/" className="text-sm text-amber-700 underline">Go to Beerolog</Link>
      </main>
    )
  }

  const { venueId, beerIds } = state
  const tapBeers = BEER_SEEDS.filter((b) => beerIds.includes(b.name))

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-6 pt-10 bg-gradient-to-b from-amber-50 to-white">
      <div className="w-full max-w-sm flex flex-col gap-6">

        <div className="text-center">
          <h1 className="text-3xl font-bold text-neutral-900">What's on tap</h1>
          <p className="mt-1 text-sm text-neutral-500">{tapBeers.length} beers available</p>
        </div>

        <div className="rounded-2xl bg-amber-100 border border-amber-200 p-5 text-center">
          <p className="text-sm text-amber-800 font-medium">Take the 2-min quiz to get matched to the best beer on this tap list</p>
          <Link
            to="/quiz"
            search={{ venue: venueId }}
            className="mt-3 inline-block rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700"
          >
            Find my beer →
          </Link>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">All beers on tap</h2>
          {tapBeers.length === 0 ? (
            <p className="text-sm text-neutral-400">No beers listed yet.</p>
          ) : (
            tapBeers.map((beer) => (
              <div key={beer.name} className="rounded-xl border border-neutral-200 bg-white p-4">
                <p className="font-semibold text-neutral-900">{beer.name}</p>
                <p className="text-sm text-neutral-500">{beer.brewery} · {beer.style.replace('_', ' ')} · {beer.abv}%</p>
              </div>
            ))
          )}
        </div>

      </div>
    </main>
  )
}
