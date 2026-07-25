import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../test/render'
import type { BaselineTaste } from '../lib/baseline-taste'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}))

vi.mock('../lib/rating-count', () => ({
  useRatingCount: () => ({ data: 7 }),
}))

vi.mock('./SessionQuickPick', () => ({
  SessionQuickPick: () => <div data-testid="session-quick-pick" />,
}))

vi.mock('./TasteRadar', () => ({
  TasteRadar: () => <div data-testid="taste-radar" />,
}))

const baseline: BaselineTaste = {
  bubbles: 0.5,
  bitterness: 0.5,
  sweetness: 0.5,
  body: 0.5,
  abv_affinity: 0.5,
  flavor_family: { malty: 0.5 },
  novelty_affinity: 0.5,
  updated_at: '2026-06-01T00:00:00+00:00',
  persona: {
    title_en: 'Malty comfort',
    blurb_en: 'Warm and familiar.',
    title_he: 'נוחות מאלטית',
    blurb_he: 'חמים ומוכר.',
  },
}

const { TasteProfileSummary } = await import('./TasteProfileSummary')

describe('TasteProfileSummary', () => {
  it('shows scan CTA, session quick-pick, identity, and taste details always open', () => {
    renderWithI18n(<TasteProfileSummary greeting="Hi" baseline={baseline} />, 'en')

    expect(screen.getByRole('link', { name: /scan a menu/i })).toHaveAttribute('href', '/menu')
    expect(screen.getByTestId('session-quick-pick')).toBeInTheDocument()
    expect(screen.getByTestId('persona-title')).toHaveTextContent('Malty comfort')
    expect(screen.getByTestId('taste-radar')).toBeInTheDocument()
    expect(screen.getByText(/7 beers rated/i)).toBeInTheDocument()
    expect(screen.queryByText(/see taste details/i)).not.toBeInTheDocument()
  })

  it('offers a share-your-type action when the profile has an archetype', () => {
    renderWithI18n(
      <TasteProfileSummary
        greeting="Hi"
        baseline={{ ...baseline, archetype: { key: 'hop-chaser' } }}
      />,
      'en',
    )
    expect(screen.getByTestId('share-archetype')).toBeInTheDocument()
  })

  it('hides the share action when no archetype is present', () => {
    renderWithI18n(<TasteProfileSummary greeting="Hi" baseline={baseline} />, 'en')
    expect(screen.queryByTestId('share-archetype')).toBeNull()
  })
})
