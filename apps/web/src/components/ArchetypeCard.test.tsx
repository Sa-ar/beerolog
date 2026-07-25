import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../test/render'

vi.mock('./TasteRadar', () => ({
  TasteRadar: () => <div data-testid="taste-radar" />,
}))

const { ArchetypeCard } = await import('./ArchetypeCard')

describe('ArchetypeCard', () => {
  it('renders name, tagline, traits, icon and radar in English (reveal)', () => {
    renderWithI18n(<ArchetypeCard archetypeKey="hop-chaser" variant="reveal" />, 'en')
    expect(screen.getByText('The Hop Chaser')).toBeInTheDocument()
    expect(screen.getByText(/all the hops/i)).toBeInTheDocument()
    expect(screen.getByText('Hoppy')).toBeInTheDocument()
    expect(screen.getByTestId('taste-radar')).toBeInTheDocument()
    expect(screen.getByTestId('archetype-card')).toHaveAttribute('dir', 'ltr')
  })

  it('renders Hebrew RTL with no uppercased latin styling on the name', () => {
    renderWithI18n(<ArchetypeCard archetypeKey="hop-chaser" variant="reveal" />, 'he')
    expect(screen.getByText('רודף הכשות')).toBeInTheDocument()
    const card = screen.getByTestId('archetype-card')
    expect(card).toHaveAttribute('dir', 'rtl')
    expect(screen.getByTestId('archetype-name').className).not.toMatch(/uppercase/)
  })

  it('renders the full-bleed 9:16 share variant', () => {
    renderWithI18n(<ArchetypeCard archetypeKey="adventurer" variant="share" />, 'en')
    expect(screen.getByTestId('archetype-card')).toHaveAttribute('data-variant', 'share')
    expect(screen.getByText('The Adventurer')).toBeInTheDocument()
  })

  it('uppercases the English name (latin display styling)', () => {
    renderWithI18n(<ArchetypeCard archetypeKey="hop-chaser" variant="reveal" />, 'en')
    expect(screen.getByTestId('archetype-name').className).toMatch(/uppercase/)
  })
})
