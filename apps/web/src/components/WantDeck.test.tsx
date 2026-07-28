import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../test/render'
import type { RecommendedBeer } from './RecommendationBeerCard'

vi.mock('../lib/match-score', () => ({
  DEFAULT_MATCH_CALIBRATION: {},
  tonightMatchPercent: () => 88,
}))
vi.mock('./SwipeBeerCard', () => ({
  SwipeBeerCard: ({ beer }: { beer: { id: string } }) => (
    <div data-testid="card">{beer.id}</div>
  ),
}))

const { WantDeck } = await import('./WantDeck')

function beer(id: string): RecommendedBeer {
  return {
    id,
    name: id,
    brewery: 'B',
    style: 'IPA',
    abv: 5,
    market_tier: 'craft',
    image_url: null,
    adventurousness: 0.5,
    why: { code: 'x', text: `why-${id}` },
    breakdown: {
      baseline_score: 1,
      session_score: 1,
      abv_score: 1,
      novelty_score: 1,
      total_score: 1,
      dominant_component: 'baseline',
    },
  } as RecommendedBeer
}

describe('WantDeck', () => {
  it('offers pass/want/must-try buttons plus undo (WCAG 2.5.1 equivalents)', () => {
    renderWithI18n(<WantDeck beers={[beer('a'), beer('b')]} />, 'en')
    expect(screen.getByRole('button', { name: 'Pass' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Want' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Must try' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
  })

  it('posts a signal on want and advances; undo reverts to the prior card', async () => {
    const onSignal = vi.fn()
    const user = userEvent.setup()
    renderWithI18n(<WantDeck beers={[beer('a'), beer('b')]} onSignal={onSignal} />, 'en')

    expect(screen.getByTestId('card')).toHaveTextContent('a')
    await user.click(screen.getByRole('button', { name: 'Want' }))
    expect(onSignal).toHaveBeenCalledWith('a', 'want')
    expect(screen.getByTestId('card')).toHaveTextContent('b')

    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.getByTestId('card')).toHaveTextContent('a')
  })

  it('renders a terminal state once the deck is exhausted', async () => {
    const user = userEvent.setup()
    renderWithI18n(<WantDeck beers={[beer('a')]} />, 'en')
    await user.click(screen.getByRole('button', { name: 'Pass' }))
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByTestId('card')).toBeNull()
  })
})
