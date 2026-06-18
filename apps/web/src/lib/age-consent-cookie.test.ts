import { describe, expect, it, beforeEach } from 'vitest'
import { AGE_VERIFIED_COOKIE, setAgeVerified } from './age-consent-cookie'

function readAgeVerifiedCookie(): boolean {
  const value = document.cookie.match(
    new RegExp('(?:^|; )' + AGE_VERIFIED_COOKIE + '=([^;]*)'),
  )?.[1]
  return value === '1'
}

describe('age-consent-cookie', () => {
  beforeEach(() => {
    document.cookie = `${AGE_VERIFIED_COOKIE}=; path=/; max-age=0`
  })

  it('starts unverified when cookie is absent', () => {
    expect(readAgeVerifiedCookie()).toBe(false)
  })

  it('setAgeVerified persists the verified cookie', () => {
    setAgeVerified()
    expect(readAgeVerifiedCookie()).toBe(true)
  })
})
