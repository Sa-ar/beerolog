import { describe, expect, it } from 'vitest'
import en from '../i18n/locales/en/common.json'
import he from '../i18n/locales/he/common.json'
import { ARCHETYPE_KEYS, ARCHETYPE_RADAR_AXES, ARCHETYPES, isArchetypeKey } from './archetypes'

type LocaleDict = {
  archetypes?: Record<string, { name?: string; tagline?: string; traits?: unknown }>
  archetypeAxis?: Record<string, string>
}

const LOCALES: Record<string, LocaleDict> = { en, he }

describe('archetype metadata', () => {
  it('has an icon (SVG, not emoji) + full radar for every key', () => {
    for (const key of ARCHETYPE_KEYS) {
      const m = ARCHETYPES[key]
      expect(m.icon.startsWith('<svg'), key).toBe(true)
      for (const axis of ARCHETYPE_RADAR_AXES) {
        const v = m.radar[axis]
        expect(typeof v, `${key}.${axis}`).toBe('number')
        expect(v >= 0 && v <= 1, `${key}.${axis}`).toBe(true)
      }
    }
  })

  it('has localized name/tagline/traits for every key in en + he', () => {
    for (const [locale, dict] of Object.entries(LOCALES)) {
      for (const key of ARCHETYPE_KEYS) {
        const entry = dict.archetypes?.[key]
        expect(entry?.name, `${locale}.${key}.name`).toBeTruthy()
        expect(entry?.tagline, `${locale}.${key}.tagline`).toBeTruthy()
        expect(
          Array.isArray(entry?.traits) && (entry.traits as unknown[]).length > 0,
          `${locale}.${key}.traits`,
        ).toBe(true)
      }
      for (const axis of ARCHETYPE_RADAR_AXES) {
        expect(dict.archetypeAxis?.[axis], `${locale}.axis.${axis}`).toBeTruthy()
      }
    }
  })

  it('has exactly the 12 documented keys with no dupes', () => {
    expect(ARCHETYPE_KEYS.length).toBe(12)
    expect(new Set(ARCHETYPE_KEYS).size).toBe(12)
  })

  it('isArchetypeKey guards unknown keys', () => {
    expect(isArchetypeKey('hop-chaser')).toBe(true)
    expect(isArchetypeKey('not-a-type')).toBe(false)
  })
})
