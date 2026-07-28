import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../test/render'
import { fetchRecommendationsPage } from '../lib/session-intent'

vi.mock('../lib/api-fetch', () => ({
  apiFetch: vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      bubbles: 0.5,
      bitterness: 0.5,
      flavor_family: {},
      novelty_affinity: 0.5,
    }),
  })),
}))

vi.mock('../lib/my-ratings', () => ({ useMyRatings: () => ({}) }))

vi.mock('../lib/session-intent', async (orig) => ({
  ...(await orig<typeof import('../lib/session-intent')>()),
  fetchRecommendationsPage: vi.fn(),
}))

// Stub the deck + sheet so this test focuses on data wiring + re-query, not
// the router-bound card / SessionQuickPick internals.
vi.mock('./WantDeck', () => ({
  WantDeck: ({ beers, onOpenRefiner }: { beers: unknown[]; onOpenRefiner?: () => void }) => (
    <div>
      <span data-testid="deck-count">{beers.length}</span>
      <button onClick={onOpenRefiner}>open-refiner</button>
    </div>
  ),
}))

vi.mock('./RefinerSheet', () => ({
  RefinerSheet: ({
    open,
    onApply,
  }: {
    open: boolean
    onApply: (s: unknown) => void
  }) =>
    open ? (
      <button onClick={() => onApply({ vibe: 'cozy', abv_intent: 'low', free_text: '' })}>
        apply-refiner
      </button>
    ) : null,
}))

const { WhatIWantDeck } = await import('./WhatIWantDeck')
const mockedFetch = vi.mocked(fetchRecommendationsPage)

beforeEach(() => {
  mockedFetch.mockReset()
  mockedFetch.mockImplementation(async ({ session }) =>
    session
      ? ([{ id: 'x' }] as never)
      : ([{ id: 'a' }, { id: 'b' }, { id: 'c' }] as never),
  )
})

describe('WhatIWantDeck', () => {
  it('loads the baseline batch, then re-queries immediately when a filter is applied', async () => {
    const user = userEvent.setup()
    renderWithI18n(<WhatIWantDeck />, 'en')

    // Baseline batch (no session) rendered highest-match-first.
    expect(await screen.findByTestId('deck-count')).toHaveTextContent('3')
    expect(mockedFetch.mock.calls[0]?.[0]?.session).toBeUndefined()
    expect(mockedFetch).toHaveBeenLastCalledWith(expect.objectContaining({ topK: 15 }))

    await user.click(screen.getByRole('button', { name: 'open-refiner' }))
    await user.click(screen.getByRole('button', { name: 'apply-refiner' }))

    // Applying the refiner re-queries with the session immediately.
    await waitFor(() =>
      expect(mockedFetch).toHaveBeenLastCalledWith(
        expect.objectContaining({ session: { vibe: 'cozy', abv_intent: 'low', free_text: '' } }),
      ),
    )
    expect(await screen.findByTestId('deck-count')).toHaveTextContent('1')
  })
})