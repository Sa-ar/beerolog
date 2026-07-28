import { screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../test/render'

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (opts: unknown) => opts,
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
  Outlet: () => <div data-testid="outlet" />,
}))

vi.mock('@clerk/tanstack-react-start', () => ({
  RedirectToSignIn: () => null,
  Show: ({ when, children }: { when: string; children: ReactNode }) =>
    when === 'signed-in' ? <>{children}</> : null,
}))

const { Route } = await import('./account')
const AccountLayout = (Route as unknown as { component: () => ReactNode }).component

describe('Account tabs', () => {
  it('renders tabs in order with Profile (taste) first', () => {
    renderWithI18n(<AccountLayout />, 'en')
    const nav = screen.getByRole('navigation', { name: 'Account' })
    const tabs = Array.from(nav.querySelectorAll('a')).map((a) => [
      a.getAttribute('href'),
      a.textContent,
    ])
    expect(tabs).toEqual([
      ['/account/profile', 'Profile'],
      ['/account/collection', 'Collection'],
      ['/account/details', 'Details'],
      ['/account/security', 'Security'],
      ['/account/settings', 'Settings'],
    ])
  })
})
