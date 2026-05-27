import { useAuth } from '@clerk/tanstack-react-start'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'

export function useRequireAuth(nextOverride?: string) {
  const { isLoaded, isSignedIn, userId } = useAuth()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  useEffect(() => {
    if (!isLoaded || isSignedIn) return
    void navigate({
      to: '/signin',
      search: { next: nextOverride ?? pathname },
    })
  }, [isLoaded, isSignedIn, navigate, nextOverride, pathname])

  return { isLoaded, isSignedIn, userId }
}
