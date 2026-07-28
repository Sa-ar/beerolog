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
import { CollectionPage } from './account.collection'

const CATCH = {
  beer_id: 'malka-stout',
  name: 'Malka Stout',
  name_hebrew: null,
  brewery: 'Malka',
  style: 'Stout',
  color: 'dark',
  image_url: null,
  proof_photo_url: 'https://b/1.jpg',
  rating: 'loved',
  created_at: '2026-06-15T00:00:02+00:00',
}

describe('CollectionPage', () => {
  it('renders caught beers with a count and the proof photo', async () => {
    getMock.mockResolvedValue({ data: { catches: [CATCH], count: 1 }, error: undefined })
    renderWithI18n(<CollectionPage />, 'en')
    await waitFor(() => expect(screen.getByText('Malka Stout')).toBeInTheDocument())
    expect(screen.getByText('1 caught')).toBeInTheDocument()
    expect(document.querySelector('img')?.getAttribute('src')).toBe('https://b/1.jpg')
  })

  it('shows an empty state when there are no catches', async () => {
    getMock.mockResolvedValue({ data: { catches: [], count: 0 }, error: undefined })
    renderWithI18n(<CollectionPage />, 'en')
    await waitFor(() => expect(screen.getByTestId('collection-empty')).toBeInTheDocument())
  })
})
