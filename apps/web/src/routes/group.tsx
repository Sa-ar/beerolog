import { createRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Route as rootRoute } from './__root'
import { createSession } from '../lib/api'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/group',
  component: GroupCreatePage,
})

function GroupCreatePage() {
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const shareUrl = sessionId
    ? `${window.location.origin}/group/${sessionId}`
    : null

  async function handleCreate() {
    setLoading(true)
    setError(null)
    try {
      const { session_id } = await createSession(crypto.randomUUID())
      setSessionId(session_id)
    } catch {
      setError('Could not create session. Is the API running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-b from-amber-50 to-white">
      <div className="w-full max-w-sm flex flex-col gap-6">

        <div className="text-center">
          <h1 className="text-4xl font-bold text-neutral-900">🍻 Group mode</h1>
          <p className="mt-2 text-neutral-500">Everyone takes the quiz. We find the one beer that works for the table.</p>
        </div>

        {!sessionId ? (
          <>
            <button
              onClick={() => void handleCreate()}
              disabled={loading}
              className="rounded-2xl bg-amber-600 py-4 text-base font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {loading ? 'Creating session…' : 'Start a group session →'}
            </button>
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          </>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl bg-green-50 border border-green-200 p-5">
              <p className="text-sm font-semibold text-green-800">Session created!</p>
              <p className="mt-1 text-sm text-green-700">Share this link with your group:</p>
              <p className="mt-2 break-all rounded-lg bg-white border border-green-200 p-3 text-xs font-mono text-neutral-700">
                {shareUrl}
              </p>
              <button
                onClick={() => void navigator.clipboard.writeText(shareUrl!)}
                className="mt-3 text-xs text-green-700 underline"
              >
                Copy link
              </button>
            </div>

            <Link
              to="/group/$sessionId/result"
              params={{ sessionId }}
              className="rounded-2xl border border-amber-300 bg-white py-3 text-center text-sm font-semibold text-amber-700 hover:bg-amber-50"
            >
              View results →
            </Link>
          </div>
        )}

        <Link to="/" className="text-center text-xs text-neutral-400 underline">Back home</Link>
      </div>
    </main>
  )
}
