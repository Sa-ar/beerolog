import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../test/render'

const getMock = vi.fn()
const postMock = vi.fn()

vi.mock('../lib/api-client/client', () => ({
  apiClient: {
    GET: (...args: unknown[]) => getMock(...args),
    POST: (...args: unknown[]) => postMock(...args),
  },
}))

const { RateSearch } = await import('./RateSearch')

const BEER = {
  id: 'b1',
  name: 'Goldstar',
  name_hebrew: null,
  brewery: 'Tempo',
  style: 'lager',
  abv: 4.9,
}

let ratingsMap: Record<string, string> = {}

beforeEach(() => {
  getMock.mockReset()
  postMock.mockReset()
  ratingsMap = {}
  getMock.mockImplementation((path: string) => {
    if (path === '/me/ratings/map') {
      return Promise.resolve({ data: { ratings: ratingsMap }, error: undefined })
    }
    return Promise.resolve({ data: [BEER], error: undefined }) // /catalog/search
  })
  postMock.mockResolvedValue({ data: undefined, error: undefined })
})

describe('RateSearch', () => {
  it('rates a searched beer via the upsert endpoint so an existing rating can be changed', async () => {
    // Search must hit /ratings (upsert), NOT the deck's /rate/session — the deck
    // guard skips already-rated beers, but search is where you change a rating
    // (issue #3).
    const user = userEvent.setup()
    renderWithI18n(<RateSearch />, 'en')

    // Typing past the 2-char threshold reveals results (debounced).
    await user.type(screen.getByRole('searchbox'), 'gold')
    expect(await screen.findByText('Goldstar')).toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: /loved it/i }))

    expect(postMock).toHaveBeenCalledWith('/ratings', {
      body: { beer_id: 'b1', rating: 'loved' },
    })
    expect(await screen.findByText(/rated/i)).toBeInTheDocument()
  })

  it('surfaces an error and rolls back the optimistic rating when the save fails', async () => {
    // A failed POST must not leave a false "saved" (silent write loss): the
    // optimistic selection reverts and an error is shown so the tap can be retried.
    postMock.mockResolvedValue({ data: undefined, error: { message: 'boom' } })
    const user = userEvent.setup()
    renderWithI18n(<RateSearch />, 'en')

    await user.type(screen.getByRole('searchbox'), 'gold')
    expect(await screen.findByText('Goldstar')).toBeInTheDocument()

    const loved = await screen.findByRole('button', { name: /loved it/i })
    await user.click(loved)

    expect(await screen.findByRole('alert')).toHaveTextContent(/retry/i)
    // Optimistic "saved" is gone and the selection reverted.
    expect(screen.queryByText(/rated ✓/i)).not.toBeInTheDocument()
    // Selection reverted: the tapper drops aria-pressed entirely when nothing is
    // selected (it was momentarily "true" during the optimistic update).
    expect(loved).not.toHaveAttribute('aria-pressed')
  })

  it('preselects an existing rating and lets it be changed', async () => {
    // Server truth: this beer was already rated 'disliked'. Search must show it
    // and still allow changing it (issue #3).
    ratingsMap = { b1: 'disliked' }
    const user = userEvent.setup()
    renderWithI18n(<RateSearch />, 'en')

    await user.type(screen.getByRole('searchbox'), 'gold')
    const disliked = await screen.findByRole('button', { name: /not for me/i })
    expect(disliked).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: /loved it/i }))
    expect(postMock).toHaveBeenCalledWith('/ratings', {
      body: { beer_id: 'b1', rating: 'loved' },
    })
  })

  it('keeps a newer same-beer rating when an older save fails after it', async () => {
    // Rating A then B for one beer, settled in reverse: B succeeds, then A fails.
    // A's late onError must not roll back or error over B's saved selection.
    const resolvers: Array<(v: { data: undefined; error: unknown }) => void> = []
    postMock.mockImplementation(() => new Promise((r) => resolvers.push(r)))
    const user = userEvent.setup()
    renderWithI18n(<RateSearch />, 'en')

    await user.type(screen.getByRole('searchbox'), 'gold')
    expect(await screen.findByText('Goldstar')).toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: /loved it/i })) // A
    await user.click(screen.getByRole('button', { name: /it was fine/i })) // B (newer)

    resolvers[1]!({ data: undefined, error: undefined }) // B settles first, ok
    resolvers[0]!({ data: undefined, error: { message: 'boom' } }) // older A fails

    expect(await screen.findByText(/rated/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /it was fine/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
