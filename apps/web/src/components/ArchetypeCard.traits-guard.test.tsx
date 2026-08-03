import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../test/render'

// When the `traits` i18n key is missing/misconfigured, i18next returns a string
// (not an array) for `returnObjects`. The card must guard before `.map` so it
// renders empty instead of crashing to a blank card.
vi.mock('./TasteRadar', () => ({
  TasteRadar: () => <div data-testid="taste-radar" />,
}))

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>()
  return {
    ...actual,
    // Any key still resolves to a string; the traits `returnObjects` lookup
    // therefore returns a string, simulating a missing/misconfigured key.
    useTranslation: () => ({
      t: (key: string, opts?: { returnObjects?: boolean }) =>
        opts?.returnObjects ? 'traits.key.missing' : key,
      i18n: { language: 'en' },
    }),
  }
})

const { ArchetypeCard } = await import('./ArchetypeCard')

describe('ArchetypeCard traits guard', () => {
  it('renders without crashing when the traits key is not an array', () => {
    expect(() =>
      renderWithI18n(<ArchetypeCard archetypeKey="hop-chaser" variant="reveal" />, 'en'),
    ).not.toThrow()
    // Card shell still renders; no trait pills, but no blank crash either.
    expect(screen.getByTestId('archetype-card')).toBeInTheDocument()
    expect(screen.getByTestId('taste-radar')).toBeInTheDocument()
  })
})
