import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const getMock = vi.fn()
const postMock = vi.fn()
vi.mock('../lib/api-client/client', () => ({
  apiClient: {
    GET: (...a: unknown[]) => getMock(...a),
    POST: (...a: unknown[]) => postMock(...a),
  },
}))
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a>,
}))
vi.mock('@clerk/tanstack-react-start', () => ({
  Show: ({ when, children }: { when: string; children: React.ReactNode }) =>
    when === 'signed-out' ? children : null,
  useAuth: () => ({ isSignedIn: false }),
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
  image_url: 'https://cdn.example/beer.jpg',
  adventurousness: 0.55,
  ibu: 60,
}

describe('BeerDetailView', () => {
  it('shows a loading skeleton while the beer is fetching', () => {
    getMock.mockReturnValue(new Promise(() => {}))
    renderWithI18n(<BeerDetailView id="x" />, 'en')
    expect(screen.getByTestId('beer-loading')).toBeInTheDocument()
    expect(screen.getByText(/loading beer/i)).toBeInTheDocument()
  })

  it('renders immediately from loader data without waiting on a second fetch', () => {
    getMock.mockClear()
    renderWithI18n(<BeerDetailView id="x" initialBeer={BEER} />, 'en')
    expect(screen.getByTestId('beer-detail')).toBeInTheDocument()
    expect(screen.getByText('Alexander Blazer')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Alexander Blazer' })).toHaveAttribute(
      'src',
      BEER.image_url,
    )
    expect(screen.getByText('60 IBU')).toBeInTheDocument()
    expect(getMock.mock.calls.some((c) => c[0] === '/catalog/{beer_id}')).toBe(false)
  })

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

  it('shows not-found immediately when the loader already failed', () => {
    renderWithI18n(<BeerDetailView id="nope" initialBeer={null} />, 'en')
    expect(screen.getByText("We couldn't find that beer")).toBeInTheDocument()
  })
})
