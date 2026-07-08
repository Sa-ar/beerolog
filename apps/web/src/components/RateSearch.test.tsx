import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../test/render'

const mutate = vi.fn()

vi.mock('../lib/rate-search', () => ({
  useBeerSearch: () => ({
    data: [
      { id: 'b1', name: 'Goldstar', name_hebrew: null, brewery: 'Tempo', style: 'lager', abv: 4.9 },
    ],
    isPending: false,
    isError: false,
  }),
  useRateOne: () => ({ mutate }),
}))

const { RateSearch } = await import('./RateSearch')

describe('RateSearch', () => {
  it('rates a searched beer directly and shows a saved state', async () => {
    const user = userEvent.setup()
    renderWithI18n(<RateSearch />, 'en')

    // Typing past the 2-char threshold reveals results (debounced).
    await user.type(screen.getByRole('searchbox'), 'gold')
    expect(await screen.findByText('Goldstar')).toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: /loved it/i }))

    expect(mutate).toHaveBeenCalledWith({ beerId: 'b1', rating: 'loved' })
    expect(await screen.findByText(/rated/i)).toBeInTheDocument()
  })
})
