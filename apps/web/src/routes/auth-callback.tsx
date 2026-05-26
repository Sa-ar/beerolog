import { createRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Route as rootRoute } from './__root'
import { setToken } from '../lib/auth'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/callback',
  component: AuthCallbackPage,
})

function AuthCallbackPage() {
  useEffect(() => {
    // Cognito returns the token in the URL hash as id_token
    const hash = window.location.hash.slice(1)
    const params = new URLSearchParams(hash)
    const token = params.get('id_token')
    const next = params.get('state') || '/profile'
    if (token) {
      setToken(token)
    }
    window.location.replace(next)
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-neutral-400 animate-pulse">Signing you in…</p>
    </main>
  )
}
