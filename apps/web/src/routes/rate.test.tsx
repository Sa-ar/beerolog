import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../test/render'

const getMock = vi.fn()
const postMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
    className,
  }: {
    to: string
    children: React.ReactNode
    className?: string
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))

vi.mock('../lib/api-client/client', () => ({
  apiClient: {
    GET: (...args: unknown[]) => getMock(...args),
    POST: (...args: unknown[]) => postMock(...args),
  },
}))

const { RateDeckFlow } = await import('../components/RateDeckFlow')

const DECK = {
  beers: [
    { id: 'a', name: 'Beer A', name_hebrew: null, brewery: 'Brew', style: 'lager', abv: 5 },
    { id: 'b', name: 'Beer B', name_hebrew: null, brewery: 'Brew', style: 'ipa', abv: 6 },
  ],
}

beforeEach(() => {
  getMock.mockReset()
  postMock.mockReset()
  getMock.mockResolvedValue({ data: DECK, error: undefined })
  postMock.mockResolvedValue({ data: { id: 'r1', rating: 'loved' }, error: undefined })
})

describe('RateDeckFlow', () => {
  it('saves each swipe immediately so a partial deck still persists', async () => {
    const user = userEvent.setup()
    renderWithI18n(<RateDeckFlow />, 'en')

    expect(await screen.findByText('Beer A')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox'), 'tasty')
    await user.click(screen.getByRole('button', { name: /loved it/i }))

    // Saved right away via /ratings — not held in a batch until the deck ends,
    // so leaving mid-deck still persists what was rated.
    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith('/ratings', {
        body: { beer_id: 'a', rating: 'loved', note: 'tasty' },
      }),
    )

    expect(await screen.findByText('Beer B')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /not for me/i }))
    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith('/ratings', {
        body: { beer_id: 'b', rating: 'disliked' },
      }),
    )

    expect(await screen.findByRole('status')).toBeInTheDocument()
    expect(screen.getByText(/saved 2 ratings/i)).toBeInTheDocument()
  })

  it('undoes the last swipe', async () => {
    const user = userEvent.setup()
    renderWithI18n(<RateDeckFlow />, 'en')

    expect(await screen.findByText('Beer A')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /loved it/i }))
    expect(await screen.findByText('Beer B')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /undo last/i }))
    expect(await screen.findByText('Beer A')).toBeInTheDocument()
    expect(screen.queryByText('Beer B')).not.toBeInTheDocument()
  })

  it('restarts the deck when rate more is clicked after completion', async () => {
    const user = userEvent.setup()
    renderWithI18n(<RateDeckFlow />, 'en')

    expect(await screen.findByText('Beer A')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /loved it/i }))
    expect(await screen.findByText('Beer B')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /not for me/i }))

    await waitFor(() => expect(postMock).toHaveBeenCalledTimes(2))
    getMock.mockClear()
    await user.click(screen.getByRole('button', { name: /rate more beers/i }))

    await waitFor(() => expect(getMock).toHaveBeenCalledWith('/rate/deck'))
    expect(await screen.findByText('Beer A')).toBeInTheDocument()
  })

  it('shows an empty state when the deck has no beers', async () => {
    getMock.mockResolvedValue({ data: { beers: [] }, error: undefined })
    renderWithI18n(<RateDeckFlow />, 'en')
    expect(await screen.findByText(/no beers/i)).toBeInTheDocument()
  })
})
