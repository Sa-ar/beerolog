import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../test/render'
import type { DeckCard } from './WantDeck'

// WCAG 2.5.1 (Level A): every swipe on both decks has an operable on-screen
// button equivalent + undo, exposed with accessible names/roles. RTL mirrors.
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}))

const { WantDeck } = await import('./WantDeck')

const card: DeckCard = {
  id: 'a',
  name: 'A',
  brewery: 'B',
  style: 'IPA',
  abv: 5,
  image_url: null,
  color: 'gold',
  matchPercent: 80,
  why: null,
}

describe('deck accessibility (WCAG 2.5.1)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('What I want: swipe controls are a named group of operable buttons + undo', () => {
    renderWithI18n(<WantDeck beers={[card]} onOpenRefiner={() => {}} />, 'en')
    // Named group so the button equivalents are discoverable.
    expect(screen.getByRole('group', { name: /swipe right to want/i })).toBeInTheDocument()
    for (const name of ['Pass', 'Want', 'Must try']) {
      expect(screen.getByRole('button', { name })).toBeEnabled()
    }
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument()
  })

  it('What I want: keeps the named group + button equivalents in Hebrew (RTL)', () => {
    renderWithI18n(<WantDeck beers={[card]} />, 'he')
    expect(screen.getByRole('group')).toBeInTheDocument()
    // Pass / Want / Must-try equivalents plus Undo all render (named in Hebrew).
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(4)
  })

  it('What I want: first arrow key asks before committing; confirm enables arrows', async () => {
    const user = userEvent.setup()
    const onSignal = vi.fn()
    renderWithI18n(<WantDeck beers={[card]} onSignal={onSignal} />, 'en')

    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(onSignal).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: /use the arrow keys/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /got it/i }))
    expect(onSignal).toHaveBeenCalledWith('a', 'want')
    expect(localStorage.getItem('beerolog_want_arrow_keys')).toBe('1')
  })

  it('What I want: ignores arrow keys when the preference is off', () => {
    localStorage.setItem('beerolog_want_arrow_keys', '0')
    const onSignal = vi.fn()
    renderWithI18n(<WantDeck beers={[card]} onSignal={onSignal} />, 'en')

    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(onSignal).not.toHaveBeenCalled()
    expect(screen.queryByRole('heading', { name: /use the arrow keys/i })).not.toBeInTheDocument()
  })
})
