import { useAuth } from '@clerk/tanstack-react-start'
import { useEffect } from 'react'
import { registerAuthTokenGetter } from '@beerolog/shared'

export function AuthTokenBridge() {
  const { getToken, isLoaded } = useAuth()

  useEffect(() => {
    if (!isLoaded) return
    registerAuthTokenGetter(() => getToken())
  }, [getToken, isLoaded])

  return null
}
