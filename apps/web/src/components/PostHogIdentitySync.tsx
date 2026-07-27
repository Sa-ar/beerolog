import { useAuth, useUser } from '@clerk/tanstack-react-start'
import { useEffect } from 'react'
import { identifyUser, resetAnalyticsUser } from '../lib/analytics'

// Syncs Clerk's auth state with PostHog identity. Mounted inside ClerkProvider
// so useAuth/useUser are available. Runs identify() on every page load when
// signed in so events are correlated to the user across sessions.
export function PostHogIdentitySync() {
  const { userId, isSignedIn } = useAuth()
  const { user } = useUser()

  useEffect(() => {
    if (!isSignedIn || !userId) return
    identifyUser(userId, {
      firstName: user?.firstName ?? null,
      lastName: user?.lastName ?? null,
    })
  }, [isSignedIn, userId, user?.firstName, user?.lastName])

  useEffect(() => {
    if (isSignedIn === false) resetAnalyticsUser()
  }, [isSignedIn])

  return null
}
