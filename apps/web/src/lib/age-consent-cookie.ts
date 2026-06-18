import { createIsomorphicFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'

export const AGE_VERIFIED_COOKIE = 'age_verified'
const VERIFIED_VALUE = '1'

function readClientCookie(name: string): string | undefined {
  const value = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))?.[1]
  return value == null ? undefined : decodeURIComponent(value)
}

function isVerifiedValue(value: string | undefined | null): boolean {
  return value === VERIFIED_VALUE
}

export const getAgeVerified = createIsomorphicFn()
  .server(() => isVerifiedValue(getCookie(AGE_VERIFIED_COOKIE)))
  .client(() => isVerifiedValue(readClientCookie(AGE_VERIFIED_COOKIE)))

export function setAgeVerified() {
  document.cookie = `${AGE_VERIFIED_COOKIE}=${VERIFIED_VALUE}; path=/; max-age=31536000; samesite=lax`
}
