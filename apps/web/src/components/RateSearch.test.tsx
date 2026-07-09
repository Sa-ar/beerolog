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

beforeEach(() => {
  getMock.mockReset()
  postMock.mockReset()
  getMock.mockResolvedValue({ data: [BEER], error: undefined })
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
})
