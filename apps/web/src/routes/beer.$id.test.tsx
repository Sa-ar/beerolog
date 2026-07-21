import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const getMock = vi.fn()
vi.mock('../lib/api-client/client', () => ({
  apiClient: { GET: (...a: unknown[]) => getMock(...a) },
}))
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a>,
}))

import { renderWithI18n } from '../test/render'
import { BeerDetailView } from './beer.$id'

const BEER = {
  id: 'x',
  name: 'Alexander Blazer',
  name_hebrew: null,
  brewery: 'Alexander',
  style: 'American IPA',
  abv: 6.2,
  market_tier: 'craft',
  color: 'amber',
  image_url: null,
  adventurousness: 0.55,
  ibu: 60,
}

describe('BeerDetailView', () => {
  it('renders the objective detail (radar + facts) and the quiz CTA', async () => {
    getMock.mockResolvedValue({ data: BEER, error: undefined })
    renderWithI18n(<BeerDetailView id="x" />, 'en')
    await waitFor(() => expect(screen.getByTestId('beer-detail')).toBeInTheDocument())
    expect(screen.getByText('Alexander Blazer')).toBeInTheDocument()
    expect(screen.getByTestId('taste-radar')).toBeInTheDocument()
    expect(screen.getByText('Find your beer match')).toBeInTheDocument()
  })

  it('shows a not-found state + CTA when the beer is missing', async () => {
    getMock.mockResolvedValue({ data: undefined, error: { detail: 'nope' } })
    renderWithI18n(<BeerDetailView id="nope" />, 'en')
    await waitFor(() =>
      expect(screen.getByText("We couldn't find that beer")).toBeInTheDocument(),
    )
    expect(screen.getByText('Find your beer match')).toBeInTheDocument()
  })
})
