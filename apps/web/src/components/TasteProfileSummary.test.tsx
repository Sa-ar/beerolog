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
}

const { TasteProfileSummary } = await import('./TasteProfileSummary')

describe('TasteProfileSummary', () => {
  it('links to /rate and shows rating progress', async () => {
    renderWithI18n(<TasteProfileSummary greeting="Hi" baseline={baseline} />, 'en')
    const link = await screen.findByRole('link', { name: /rate beers/i })
    expect(link).toHaveAttribute('href', '/rate')
    expect(await screen.findByText(/7 beers rated/i)).toBeInTheDocument()
  })
})
