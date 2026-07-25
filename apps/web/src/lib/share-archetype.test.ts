import { afterEach, describe, expect, it, vi } from 'vitest'
import { shareArchetype } from './share-archetype'

const ORIGIN = 'https://beerolog.com'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function stubFetchOk() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, blob: async () => new Blob(['x'], { type: 'image/png' }) })),
  )
}

describe('shareArchetype', () => {
  it('shares the story image via the native sheet when files are supported', async () => {
    stubFetchOk()
    const share = vi.fn(async () => undefined)
    vi.stubGlobal('navigator', { share, canShare: () => true })
    const outcome = await shareArchetype({ key: 'hop-chaser', lang: 'en', text: 'hi', origin: ORIGIN })
    expect(outcome).toBe('shared')
    const arg = (share.mock.calls[0] as unknown[])[0] as { files: File[]; url: string }
    expect(arg.files).toHaveLength(1)
    expect(arg.url).toBe(`${ORIGIN}/taste/hop-chaser`)
  })

  it('falls back to sharing text+url when files are unsupported', async () => {
    stubFetchOk()
    const share = vi.fn(async () => undefined)
    vi.stubGlobal('navigator', { share, canShare: () => false })
    const outcome = await shareArchetype({ key: 'adventurer', lang: 'he', text: 'hi', origin: ORIGIN })
    expect(outcome).toBe('shared')
    expect(((share.mock.calls[0] as unknown[])[0] as { files?: File[] }).files).toBeUndefined()
  })

  it('copies the /taste link when native share is unavailable', async () => {
    const writeText = vi.fn(async () => undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const outcome = await shareArchetype({ key: 'sour-seeker', lang: 'en', text: 'hi', origin: ORIGIN })
    expect(outcome).toBe('copied')
    expect(writeText).toHaveBeenCalledWith(`hi ${ORIGIN}/taste/sour-seeker`)
  })

  it('returns dismissed when the user cancels the native sheet', async () => {
    stubFetchOk()
    const share = vi.fn(async () => {
      throw Object.assign(new Error('cancelled'), { name: 'AbortError' })
    })
    vi.stubGlobal('navigator', { share, canShare: () => true })
    const outcome = await shareArchetype({ key: 'heavyweight', lang: 'en', text: 'hi', origin: ORIGIN })
    expect(outcome).toBe('dismissed')
  })
})
