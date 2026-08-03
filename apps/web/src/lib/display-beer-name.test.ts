import { describe, expect, it } from 'vitest'
import { displayBeerName } from './display-beer-name'

describe('displayBeerName', () => {
  it('shows the Hebrew name in Hebrew when one exists', () => {
    expect(displayBeerName({ name: 'Goldstar', name_hebrew: 'גולדסטאר' }, 'he')).toBe('גולדסטאר')
  })

  it('falls back to the canonical name in Hebrew when no Hebrew name is present', () => {
    expect(displayBeerName({ name: 'Goldstar', name_hebrew: null }, 'he')).toBe('Goldstar')
    expect(displayBeerName({ name: 'Goldstar' }, 'he')).toBe('Goldstar')
  })

  it('shows the canonical name in English even when a Hebrew name exists', () => {
    expect(displayBeerName({ name: 'Goldstar', name_hebrew: 'גולדסטאר' }, 'en')).toBe('Goldstar')
  })

  it('normalizes unknown/undefined language to the Hebrew default', () => {
    expect(displayBeerName({ name: 'Goldstar', name_hebrew: 'גולדסטאר' }, undefined)).toBe('גולדסטאר')
  })
})
