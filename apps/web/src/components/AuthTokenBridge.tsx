import { useAuth } from '@clerk/tanstack-react-start'
import { useEffect } from 'react'
import { registerAuthTokenGetter } from '../lib/auth-session'

export function AuthTokenBridge() {
  const { getToken, isLoaded } = useAuth()

  useEffect(() => {
    if (!isLoaded) return
    registerAuthTokenGetter(() => getToken())
  }, [getToken, isLoaded])

  return null
}
