import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../test/render'
import type { DeckCard } from './WantDeck'

vi.mock('./SwipeBeerCard', () => ({
  SwipeBeerCard: ({ beer }: { beer: { id: string } }) => (
    <div data-testid="card">{beer.id}</div>
  ),
}))

const { WantDeck } = await import('./WantDeck')

function beer(id: string): DeckCard {
  return {
    id,
    name: id,
    brewery: 'B',
    style: 'IPA',
    abv: 5,
    image_url: null,
    color: 'gold',
    matchPercent: 88,
    why: `why-${id}`,
  }
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

  it('preloads the next batch when few cards remain and more exist', () => {
    const onNearEnd = vi.fn()
    // Four cards left = the preload threshold, so it fires on mount.
    renderWithI18n(
      <WantDeck beers={[beer('a'), beer('b'), beer('c'), beer('d')]} hasMore onNearEnd={onNearEnd} />,
      'en',
    )
    expect(onNearEnd).toHaveBeenCalled()
  })

  it('does not preload while a full batch remains', () => {
    const onNearEnd = vi.fn()
    const many = Array.from({ length: 15 }, (_, i) => beer(`b${i}`))
    renderWithI18n(<WantDeck beers={many} hasMore onNearEnd={onNearEnd} />, 'en')
    expect(onNearEnd).not.toHaveBeenCalled()
  })

  it('shows the provided end card (not the default) when exhausted with no more', () => {
    renderWithI18n(
      <WantDeck beers={[]} hasMore={false} endCard={<div>terminal-card</div>} />,
      'en',
    )
    expect(screen.getByText('terminal-card')).toBeInTheDocument()
  })

  it('opens the refiner from the header when a handler is given', async () => {
    const onOpenRefiner = vi.fn()
    const user = userEvent.setup()
    renderWithI18n(<WantDeck beers={[beer('a')]} onOpenRefiner={onOpenRefiner} />, 'en')
    await user.click(screen.getByRole('button', { name: 'Refine' }))
    expect(onOpenRefiner).toHaveBeenCalled()
  })

  it('exposes refine when a refiner handler is given', async () => {
    const onOpenRefiner = vi.fn()
    const user = userEvent.setup()
    renderWithI18n(<WantDeck beers={[beer('a')]} onOpenRefiner={onOpenRefiner} />, 'en')
    await user.click(screen.getByRole('button', { name: /refine/i }))
    expect(onOpenRefiner).toHaveBeenCalled()
  })
})
