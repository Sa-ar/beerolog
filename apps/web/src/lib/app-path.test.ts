import { describe, expect, it } from 'vitest'
import { appPath } from './app-path'

describe('appPath', () => {
  it('strips trailing slashes so waitForURL matches either host style', () => {
    expect(appPath('/onboarding')).toBe('/onboarding')
    expect(appPath('/onboarding/')).toBe('/onboarding')
    expect(appPath('/recommendations/')).toBe('/recommendations')
    expect(appPath('/account/profile/')).toBe('/account/profile')
  })

  it('keeps the site root as /', () => {
    expect(appPath('/')).toBe('/')
    expect(appPath('')).toBe('/')
    expect(appPath(new URL('https://example.test/'))).toBe('/')
  })
})
