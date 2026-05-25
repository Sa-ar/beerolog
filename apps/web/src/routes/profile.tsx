import { createRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Route as rootRoute } from './__root'
import { getUser, clearToken } from '../lib/auth'
import { getMyHistory, getMyPersona } from '../lib/api'
import type { PersonaData } from '../lib/api'
import { BEER_SEEDS } from '../data/beers'
import { PersonaCard } from '../components/PersonaCard'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: ProfilePage,
})

function ProfilePage() {
  const navigate = useNavigate()
  const user = getUser()

  const [history, setHistory] = useState<Array<{ beer_id: string; rating: string | null; tried_at: string }> | null>(null)
  const [persona, setPersona] = useState<PersonaData | null>(null)

  useEffect(() => {
    if (!user) {
      void navigate({ to: '/signin' })
      return
    }
    void getMyHistory().then(setHistory).catch(() => setHistory([]))
    void getMyPersona().then((p) => { if (p) setPersona(p) })
  }, [])

  function handleShare() {
    if (!persona) return
    const text = `I'm ${persona.name} on Beerolog ${persona.icon} — find your beer persona at beerolog.app`
    if (navigator.share) {
      void navigator.share({ text })
    } else {
      void navigator.clipboard.writeText(text)
    }
  }

  function handleSignOut() {
    clearToken()
    void navigate({ to: '/' })
  }

  if (!user) return null

  const beerMap = Object.fromEntries(BEER_SEEDS.map((b) => [b.name, b]))

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-6 pt-10 bg-gradient-to-b from-amber-50 to-white">
      <div className="w-full max-w-sm flex flex-col gap-6">

        {persona && (
          <div className="flex flex-col gap-2">
            <PersonaCard persona={persona} userName={user.name ?? user.email} />
            <button
              onClick={handleShare}
              className="rounded-xl border border-amber-300 bg-white py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-50"
            >
              📲 Share my persona
            </button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">{user.name ?? user.email}</h1>
            <p className="text-sm text-neutral-500">{user.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-sm text-neutral-400 underline hover:text-neutral-600"
          >
            Sign out
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Beer history</h2>
          {!history && <p className="text-sm text-neutral-400 animate-pulse">Loading…</p>}
          {history?.length === 0 && (
            <p className="text-sm text-neutral-400">No beers logged yet. Take the quiz to get started.</p>
          )}
          {history?.map((entry, i) => {
            const beer = beerMap[entry.beer_id]
            return (
              <div key={i} className="rounded-xl border border-neutral-200 bg-white p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-neutral-900">{beer?.name ?? entry.beer_id}</p>
                  {beer && <p className="text-sm text-neutral-500">{beer.brewery} · {beer.style.replace('_', ' ')}</p>}
                </div>
                {entry.rating && (
                  <span className="text-sm font-medium text-amber-700 capitalize">{entry.rating}</span>
                )}
              </div>
            )
          })}
        </div>

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

      </div>
    </main>
  )
}
