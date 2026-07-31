import { screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../test/render'
import { SwipeBeerCard, type CardBeer } from './SwipeBeerCard'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    params,
    children,
  }: {
    to: string
    params?: { id: string }
    children: ReactNode
  }) => <a href={`${to.replace('$id', params?.id ?? '')}`}>{children}</a>,
}))

const base: CardBeer = {
  id: 'b1',
  name: 'Hazy Days',
  brewery: 'Alewife',
  style: 'IPA',
  abv: 6.2,
  image_url: 'https://blob/hazy.jpg',
  color: 'gold',
}

describe('SwipeBeerCard', () => {
  it('renders the hero photo, match %, name, and pills — no deep facts', () => {
    renderWithI18n(<SwipeBeerCard beer={base} matchPercent={91} why="Bright and juicy." />, 'en')
    const photos = document.querySelectorAll('img')
    expect(photos.length).toBeGreaterThanOrEqual(1)
    expect([...photos].every((img) => img.getAttribute('src') === 'https://blob/hazy.jpg')).toBe(
      true,
    )
    expect(screen.getByText('91% match')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Hazy Days' })).toBeInTheDocument()
    expect(screen.getByText('IPA')).toBeInTheDocument()
    expect(screen.getByText('Bright and juicy.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /details/i })).toHaveAttribute('href', '/beer/b1')
    expect(screen.queryByTestId('card-swatch')).toBeNull()
  })

  it('renders the designed color-swatch fallback when there is no photo', () => {
    renderWithI18n(<SwipeBeerCard beer={{ ...base, image_url: null }} />, 'en')
    expect(document.querySelector('img')).toBeNull()
    expect(screen.getByTestId('card-swatch')).toBeInTheDocument()
  })

  it('shows the super-like marker when the beer is pinned', () => {
    renderWithI18n(<SwipeBeerCard beer={base} superLiked />, 'en')
    expect(screen.getByLabelText(/must try/i)).toBeInTheDocument()
  })
})
