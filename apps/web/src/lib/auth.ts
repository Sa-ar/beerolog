const TOKEN_KEY = 'beerolog_token'

export type AuthUser = {
  sub: string
  email: string
  name?: string | undefined
}

export function getToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export function getUser(): AuthUser | null {
  const token = getToken()
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as Record<string, unknown>
    return {
      sub: String(payload['sub'] ?? ''),
      email: String(payload['email'] ?? ''),
      name: payload['name'] ? String(payload['name']) : undefined,
    }
  } catch {
    return null
  }
}

export function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export function getCognitoSignInUrl(): string {
  const domain = (import.meta.env['VITE_COGNITO_DOMAIN'] as string | undefined) ?? ''
  const clientId = (import.meta.env['VITE_COGNITO_CLIENT_ID'] as string | undefined) ?? ''
  const redirect = encodeURIComponent(`${window.location.origin}/auth/callback`)
  return `${domain}/oauth2/authorize?client_id=${clientId}&response_type=token&scope=openid+email+profile&redirect_uri=${redirect}`
}
