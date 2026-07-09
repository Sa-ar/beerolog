import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../test/render'
import type { RecommendedBeer } from './RecommendationBeerCard'

const postMock = vi.fn()
const getMock = vi.fn()

vi.mock('../lib/api-client/client', () => ({
  apiClient: {
    POST: (...args: unknown[]) => postMock(...args),
    GET: (...args: unknown[]) => getMock(...args),
  },
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}))

const { RecommendationBeerCard } = await import('./RecommendationBeerCard')

const BEER: RecommendedBeer = {
  id: 'goldstar',
  name: 'Goldstar',
  name_hebrew: null,
  brewery: 'Tempo',
  style: 'lager',
  abv: 4.9,
  market_tier: 'mainstream',
  color: null,
  image_url: null,
  why: { code: 'baseline' },
  breakdown: {
    baseline_cos: 0.5,
    session_cos: 0,
    baseline_score: 0.5,
    session_score: 0,
    abv_score: 0,
    abv_fits_intent: null,
    novelty_score: 0,
    total_score: 0.5,
    dominant_component: 'baseline',
  },
}

function renderCard() {
  return renderWithI18n(
    <RecommendationBeerCard
      beer={BEER}
      rank={1}
      matchPercent={80}
      alpha={0.6}
      hasSession={false}
    />,
    'en',
  )
}

beforeEach(() => {
  postMock.mockReset()
  getMock.mockReset()
  postMock.mockResolvedValue({ data: { id: 'r1', rating: 'loved' }, error: undefined })
  getMock.mockResolvedValue({ data: { ratings: {} }, error: undefined })
})

describe('RecommendationBeerCard rating', () => {
  it('posts the rating for this beer when a tap is chosen', async () => {
    const user = userEvent.setup()
    renderCard()
    await user.click(screen.getByRole('button', { name: /loved it/i }))

    expect(postMock).toHaveBeenCalledWith('/ratings', {
      body: { beer_id: 'goldstar', rating: 'loved' },
    })
    expect(await screen.findByRole('status')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /rate more in a quick deck/i })).toHaveAttribute(
      'href',
      '/rate',
    )
  })

  it('preselects the existing rating from server truth', async () => {
    // Re-rating is allowed on this surface, but it must show what you already
    // chose (issue #3).
    getMock.mockResolvedValue({ data: { ratings: { goldstar: 'fine' } }, error: undefined })
    renderCard()
    // Waits for the async ratings-map query to resolve and mark the button.
    expect(
      await screen.findByRole('button', { name: /it was fine/i, pressed: true }),
    ).toBeInTheDocument()
  })

  it('surfaces an error and lets the user retry', async () => {
    const user = userEvent.setup()
    postMock.mockResolvedValueOnce({ data: undefined, error: { detail: 'boom' } })
    renderCard()
    await user.click(screen.getByRole('button', { name: /not for me/i }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    // retry still possible
    await user.click(screen.getByRole('button', { name: /not for me/i }))
    expect(postMock).toHaveBeenCalledTimes(2)
  })
})
