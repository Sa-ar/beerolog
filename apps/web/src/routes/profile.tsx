import { useAuth, useUser } from '@clerk/tanstack-react-start'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { PersonaCard } from '../components/PersonaCard'
import { getMyHistory, getMyPersona } from '../lib/api'
import type { HistoryEntry, PersonaData } from '../lib/api'
import { BEER_METADATA_BY_ID } from '../lib/catalog'
import { useRequireAuth } from '../lib/require-auth'

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  const { isLoaded, isSignedIn } = useRequireAuth()
  const { user } = useUser()
  const { signOut } = useAuth()

  const [history, setHistory] = useState<HistoryEntry[] | null>(null)
  const [persona, setPersona] = useState<PersonaData | null>(null)

  useEffect(() => {
    if (!isSignedIn) return
    void getMyHistory().then(setHistory).catch(() => setHistory([]))
    void getMyPersona().then((p) => {
      if (p) setPersona(p)
    })
  }, [isSignedIn])

  function handleShare() {
    if (!persona) return
    const text = `I'm ${persona.name} on Beerolog ${persona.icon} — find your beer persona at beerolog.app`
    if (navigator.share) {
      void navigator.share({ text })
    } else {
      void navigator.clipboard.writeText(text)
    }
  }

  async function handleSignOut() {
    await signOut()
    window.location.assign('/')
  }

  if (!isLoaded || !isSignedIn || !user) {
    return (
      <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-6">
        <p className="text-sm text-neutral-400 animate-pulse">Loading your profile…</p>
      </main>
    )
  }

  const displayName =
    user.fullName ?? user.firstName ?? user.primaryEmailAddress?.emailAddress ?? 'Beerolog member'
  const email = user.primaryEmailAddress?.emailAddress ?? ''

  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-start p-6 pt-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        {persona && (
          <div className="flex flex-col gap-2">
            <PersonaCard persona={persona} userName={displayName} />
            <button
              type="button"
              onClick={handleShare}
              className="rounded-xl border border-amber-300 bg-white py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-50"
            >
              📲 Share my persona
            </button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">{displayName}</h1>
            {email ? <p className="text-sm text-neutral-500">{email}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="text-sm text-neutral-400 underline hover:text-neutral-600"
          >
            Sign out
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Beer history</h2>
          {!history && <p className="animate-pulse text-sm text-neutral-400">Loading…</p>}
          {history?.length === 0 && (
            <p className="text-sm text-neutral-400">No beers logged yet. Take the quiz to get started.</p>
          )}
          {history?.map((entry, i) => {
            const beer = BEER_METADATA_BY_ID[entry.beer_id]
            return (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4"
              >
                <div>
                  <p className="font-semibold text-neutral-900">{beer?.name ?? entry.beer_id}</p>
                  {beer && (
                    <p className="text-sm text-neutral-500">
                      {beer.brewery} · {beer.style.replace('_', ' ')}
                    </p>
                  )}
                </div>
                {entry.rating && (
                  <span className="text-sm font-medium capitalize text-amber-700">{entry.rating}</span>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex gap-3">
          <Link to="/quiz" className="flex-1">
            <button
              type="button"
              className="w-full rounded-xl border border-neutral-200 bg-white py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Get fresh picks
            </button>
          </Link>
          <Link to="/" className="flex-1">
            <button
              type="button"
              className="w-full rounded-xl border border-neutral-200 bg-white py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Home
            </button>
          </Link>
        </div>
      </div>
    </main>
  )
}
