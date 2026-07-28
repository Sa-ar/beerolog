import { screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../test/render'
import type { BaselineTaste } from '../lib/baseline-taste'

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

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (opts: unknown) => opts,
}))

vi.mock('@clerk/tanstack-react-start', () => ({
  useAuth: () => ({ getToken: async () => 'tok', isLoaded: true, userId: 'u1' }),
  useUser: () => ({ user: { firstName: 'Ada' } }),
}))

vi.mock('../lib/load-baseline-taste', () => ({
  loadBaselineTaste: vi.fn(async () => ({ status: 'ready', baseline })),
}))

vi.mock('../lib/baseline-taste', async (orig) => ({
  ...(await orig<typeof import('../lib/baseline-taste')>()),
  isStaleProfile: () => false,
}))

vi.mock('../components/TasteProfileSummary', () => ({
  TasteProfileSummary: () => <div data-testid="taste-summary" />,
}))

const { Route } = await import('./account.profile')
const ProfileTastePage = (Route as unknown as { component: () => ReactNode }).component

describe('Account > Profile (taste) tab', () => {
  it('renders the taste profile summary once the baseline loads', async () => {
    renderWithI18n(<ProfileTastePage />, 'en')
    expect(await screen.findByTestId('taste-summary')).toBeInTheDocument()
  })
})
