import { describe, expect, it, vi } from 'vitest'
import { loadOgFont } from './og-font'

describe('loadOgFont (#316)', () => {
  it('returns the embedded Rubik TTF without any network fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const font = await loadOgFont()
    expect(font).toBeInstanceOf(ArrayBuffer)
    // A real font (~175KB), not an empty/placeholder buffer.
    expect((font as ArrayBuffer).byteLength).toBeGreaterThan(10_000)
    // The whole point of #316: no runtime font fetch anymore.
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
