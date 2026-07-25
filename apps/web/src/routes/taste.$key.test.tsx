import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../test/render'

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (opts: unknown) => opts,
  notFound: () => new Error('notFound'),
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a>,
}))

const { TasteShareView } = await import('./taste.$key')

describe('TasteShareView', () => {
  it('renders the archetype card and quiz CTA in English', () => {
    renderWithI18n(<TasteShareView archetypeKey="hop-chaser" />, 'en')
    expect(screen.getByText('The Hop Chaser')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /take the 30-second quiz/i })).toHaveAttribute(
      'href',
      '/try',
    )
  })

  it('renders the archetype card and quiz CTA in Hebrew', () => {
    renderWithI18n(<TasteShareView archetypeKey="hop-chaser" />, 'he')
    expect(screen.getByText('רודף הכשות')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /חידון/ })).toHaveAttribute('href', '/try')
  })
})
