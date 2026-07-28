import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../test/render'
import { fetchRecommendationsPage } from '../lib/session-intent'

const { scanState, apiState } = vi.hoisted(() => ({
  scanState: { results: [] as unknown[] },
  apiState: { status: 200 },
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}))

vi.mock('../lib/menu-scan', () => ({
  useScanMenu: () => ({
    mutate: (_args: unknown, opts?: { onSuccess?: (r: unknown) => void }) =>
      opts?.onSuccess?.(scanState.results),
    isPending: false,
    isError: false,
  }),
}))

vi.mock('../lib/api-fetch', () => ({
  apiFetch: vi.fn(async () => {
    if (apiState.status === 404) return { ok: false, status: 404, json: async () => ({}) }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        bubbles: 0.5,
        bitterness: 0.5,
        flavor_family: {},
        novelty_affinity: 0.5,
      }),
    }
  }),
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

beforeEach(() => {
  scanState.results = []
  apiState.status = 200
})

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

  it('scans a menu, scopes the deck to the extracted beers, and clears back', async () => {
    scanState.results = [
      { matched_id: 'm1', name: 'M1', taste_fit: 0.9, raw_text: 'M1', confidence: 1, needs_review: false },
      { matched_id: 'm2', name: 'M2', taste_fit: 0.7, raw_text: 'M2', confidence: 1, needs_review: false },
      { matched_id: null, raw_text: 'unmatched', confidence: 0.2, needs_review: true },
    ]
    const user = userEvent.setup()
    renderWithI18n(<WhatIWantDeck />, 'en')

    expect(await screen.findByTestId('deck-count')).toHaveTextContent('3') // baseline
    fireEvent.change(screen.getByTestId('menu-scan-input'), {
      target: { files: [new File(['x'], 'menu.jpg', { type: 'image/jpeg' })] },
    })

    // Scoped to the 2 catalog-matched beers; unmatched row is dropped.
    expect(await screen.findByText(/showing/i)).toBeInTheDocument()
    expect(screen.getByTestId('deck-count')).toHaveTextContent('2')

    await user.click(screen.getByRole('button', { name: /clear/i }))
    expect(screen.getByTestId('deck-count')).toHaveTextContent('3')
  })

  it('gives a no-profile user a default deck plus a visible quiz CTA (first card + header)', async () => {
    apiState.status = 404 // no baseline profile yet
    const user = userEvent.setup()
    renderWithI18n(<WhatIWantDeck />, 'en')

    // First card is the quiz CTA + a persistent header quiz entry (two links).
    expect(await screen.findByRole('link', { name: /take the taste quiz/i })).toBeInTheDocument()
    expect(screen.getByText(/sharpen your picks/i)).toBeInTheDocument()
    expect(screen.queryByTestId('deck-count')).toBeNull() // not a wall, but lead shown first

    // Skipping reveals the default-profile deck; swipes still record signals.
    await user.click(screen.getByRole('button', { name: /start swiping/i }))
    expect(await screen.findByTestId('deck-count')).toHaveTextContent('3')
    // Header quiz entry persists until a profile exists.
    expect(screen.getByText(/sharpen your picks/i)).toBeInTheDocument()
  })

  it('hides the quiz CTA once a profile exists', async () => {
    renderWithI18n(<WhatIWantDeck />, 'en')
    expect(await screen.findByTestId('deck-count')).toHaveTextContent('3')
    expect(screen.queryByText(/sharpen your picks/i)).toBeNull()
  })
})