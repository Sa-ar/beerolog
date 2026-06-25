import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// Stub TanStack's <Link> as a plain anchor so we can assert the sign-up target
// without standing up a router context.
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    search,
    children,
    ...rest
  }: {
    to: string
    params?: unknown
    search?: { next?: string }
    children: React.ReactNode
  }) => {
    const next = search?.next ? `?next=${encodeURIComponent(search.next)}` : ''
    return (
      <a href={`${to}${next}`} {...rest}>
        {children}
      </a>
    )
  },
}))

import { renderWithI18n } from '../test/render'
import { GuestResults } from './GuestResults'
import type { GuestRecommendedBeer } from '../lib/guest-answers'

function makeBeer(n: number): GuestRecommendedBeer {
  return {
    id: `b${n}`,
    name: `Beer ${n}`,
    name_hebrew: null,
    brewery: `Brewery ${n}`,
    style: 'lager',
    abv: 5,
    color: 'gold',
    image_url: null,
    match_percent: 90 - n,
    why: `Reason ${n}`,
  }
}

function makeResults(count: number): GuestRecommendedBeer[] {
  return Array.from({ length: count }, (_, i) => makeBeer(i + 1))
}

describe('GuestResults', () => {
  it('renders exactly unlockedCount visible cards and locks the remainder', () => {
    renderWithI18n(<GuestResults results={makeResults(7)} unlockedCount={3} />, 'en')

    const visible = screen.getByTestId('guest-results-visible')
    expect(within(visible).getAllByTestId('guest-beer-card')).toHaveLength(3)
    // Visible cards are interactive (not aria-hidden, no pointer-events-none).
    for (const card of within(visible).getAllByTestId('guest-beer-card')) {
      expect(card).not.toHaveAttribute('aria-hidden', 'true')
    }
    expect(within(visible).getByText('Beer 1')).toBeInTheDocument()
    expect(within(visible).getByText('Beer 3')).toBeInTheDocument()

    // Locked region carries the blur/lock treatment and is inert.
    const locked = screen.getByTestId('guest-results-locked')
    expect(locked).toHaveAttribute('aria-hidden', 'true')
    expect(locked.className).toMatch(/blur/)
    expect(locked.className).toMatch(/pointer-events-none/)
    expect(locked.className).toMatch(/opacity-/)
    expect(within(locked).getAllByTestId('guest-beer-card')).toHaveLength(4)
    // No links inside the locked section.
    expect(within(locked).queryByRole('link')).toBeNull()
  })

  it('sign-up CTA links to /signup with next=/recommendations', () => {
    renderWithI18n(<GuestResults results={makeResults(5)} unlockedCount={3} />, 'en')
    const cta = screen.getByTestId('guest-signup-cta')
    expect(cta).toHaveAttribute('href', '/signup/$?next=%2Frecommendations')
  })

  it('shifts the visible/locked boundary purely off unlockedCount', () => {
    renderWithI18n(<GuestResults results={makeResults(7)} unlockedCount={2} />, 'en')
    expect(
      within(screen.getByTestId('guest-results-visible')).getAllByTestId('guest-beer-card'),
    ).toHaveLength(2)
    expect(
      within(screen.getByTestId('guest-results-locked')).getAllByTestId('guest-beer-card'),
    ).toHaveLength(5)
  })

  it('renders no locked section when everything is unlocked', () => {
    renderWithI18n(<GuestResults results={makeResults(3)} unlockedCount={3} />, 'en')
    expect(screen.queryByTestId('guest-results-locked')).toBeNull()
    expect(screen.queryByTestId('guest-signup-cta')).toBeNull()
  })
})
