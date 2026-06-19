import { describe, expect, it } from 'vitest'
import { LEGAL_SLUGS } from './registry'

describe('legal content registry', () => {
  it('exposes the four legal page slugs', () => {
    expect([...LEGAL_SLUGS]).toEqual(['privacy', 'terms', 'cookies', 'accessibility'])
  })
})
