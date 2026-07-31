import { describe, expect, it, vi } from 'vitest'

const postMock = vi.fn()
vi.mock('./api-client/client', () => ({
  apiClient: { POST: (...a: unknown[]) => postMock(...a) },
}))

const { fetchBeerMatchPercent } = await import('./beer-match')

describe('fetchBeerMatchPercent', () => {
  it('converts taste_fit to a 0–100 percent', async () => {
    postMock.mockResolvedValue({
      data: [{ taste_fit: 0.87 }],
      error: undefined,
    })
    await expect(fetchBeerMatchPercent('b1')).resolves.toBe(87)
  })

  it('returns null when rank has no fit', async () => {
    postMock.mockResolvedValue({ data: [{ taste_fit: null }], error: undefined })
    await expect(fetchBeerMatchPercent('b1')).resolves.toBeNull()
  })
})
