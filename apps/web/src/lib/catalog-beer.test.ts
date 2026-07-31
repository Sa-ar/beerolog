import { describe, expect, it, vi } from 'vitest'

const getMock = vi.fn()
vi.mock('./api-client/client', () => ({
  apiClient: { GET: (...a: unknown[]) => getMock(...a) },
}))

const { fetchCatalogBeer, loadCatalogBeer } = await import('./catalog-beer')

describe('catalog-beer', () => {
  it('fetchCatalogBeer returns the beer payload', async () => {
    getMock.mockResolvedValue({
      data: { id: 'b1', name: 'Test' },
      error: undefined,
    })
    await expect(fetchCatalogBeer('b1')).resolves.toEqual({ id: 'b1', name: 'Test' })
  })

  it('loadCatalogBeer returns null when the beer is missing', async () => {
    getMock.mockResolvedValue({ data: undefined, error: { detail: 'gone' } })
    await expect(loadCatalogBeer('gone')).resolves.toBeNull()
  })
})
