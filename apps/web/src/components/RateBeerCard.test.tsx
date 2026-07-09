import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../test/render'
import type { DeckBeer } from '../lib/rate-deck'
import { RateBeerCard } from './RateBeerCard'

const BEER: DeckBeer = {
  id: 'a',
  name: 'Beer A',
  name_hebrew: null,
  brewery: 'Brew',
  style: 'lager',
  abv: 5,
}

describe('RateBeerCard', () => {
  it('rates via the button baseline (the accessible / desktop path)', () => {
    const onRate = vi.fn()
    renderWithI18n(<RateBeerCard beer={BEER} onRate={onRate} />, 'en')
    fireEvent.click(screen.getByRole('button', { name: /loved it/i }))
    expect(onRate).toHaveBeenCalledWith('loved', undefined)
  })
})
