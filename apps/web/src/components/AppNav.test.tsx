import { screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../test/render'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
    className,
    'aria-current': ariaCurrent,
    'aria-label': ariaLabel,
  }: {
    to: string
    children: ReactNode
    className?: string
    'aria-current'?: 'page' | undefined
    'aria-label'?: string
  }) => (
    <a href={to} className={className} aria-current={ariaCurrent} aria-label={ariaLabel}>
      {children}
    </a>
  ),
  useRouterState: ({ select }: { select: (s: { location: { pathname: string } }) => string }) =>
    select({ location: { pathname: '/' } }),
}))

vi.mock('@clerk/tanstack-react-start', () => ({
  Show: ({ when, children }: { when: string; children: ReactNode }) =>
    when === 'signed-in' ? <>{children}</> : null,
}))

vi.mock('@beerolog/icons', () => ({
  CatalogIcon: () => <span data-testid="nav-icon" />,
}))

vi.mock('./AuthControls', () => ({
  AuthControls: () => <div data-testid="auth-controls" />,
}))

vi.mock('./UserMenu', () => ({
  UserMenu: ({ menuPlacement }: { menuPlacement?: string }) => (
    <div data-testid="user-menu" data-placement={menuPlacement ?? 'down'} />
  ),
}))

vi.mock('./BeerologLogo', () => ({
  BeerologLogo: ({ iconOnly }: { iconOnly?: boolean }) => (
    <span>{iconOnly ? 'Mark' : 'Beerolog'}</span>
  ),
}))

const { AppHeader } = await import('./AppHeader')
const { AppBottomNav } = await import('./AppBottomNav')
const { AppSidebar } = await import('./AppSidebar')

describe('signed-in primary nav', () => {
  it('keeps the mobile header to logo + auth only (hidden on desktop via md:hidden)', () => {
    const { container } = renderWithI18n(<AppHeader />, 'en')
    const header = container.querySelector('header')
    expect(header?.className).toMatch(/md:hidden/)
    expect(screen.getByRole('link', { name: /beerolog home/i })).toBeInTheDocument()
    expect(screen.getByTestId('auth-controls')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Primary' })).not.toBeInTheDocument()
  })

  it('puts logo, destinations, and user menu in the desktop sidebar', () => {
    renderWithI18n(<AppSidebar />, 'en')
    expect(screen.getByRole('link', { name: /beerolog home/i })).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Primary' })
    expect(nav.querySelectorAll('a')).toHaveLength(2)
    expect(nav.querySelector('a[href="/rate"]')).toHaveTextContent('What I know')
    expect(nav.querySelector('a[href="/"]')).toHaveTextContent('What I want')
    expect(nav.querySelector('a[href="/menu"]')).toBeNull()
    expect(nav.querySelector('a[href="/recommendations"]')).toBeNull()
    expect(nav.querySelector('a[href="/account/profile"]')).toBeNull()
    expect(screen.getByTestId('user-menu')).toHaveAttribute('data-placement', 'up')
  })

  it('shows the same two decks in the mobile bottom bar', () => {
    renderWithI18n(<AppBottomNav />, 'en')
    const nav = screen.getByRole('navigation', { name: 'Primary' })
    expect(nav.querySelectorAll('a')).toHaveLength(2)
    expect(nav.querySelector('a[href="/rate"]')).toHaveTextContent('What I know')
    expect(nav.querySelector('a[href="/"]')).toHaveTextContent('What I want')
    expect(nav.querySelector('a[href="/menu"]')).toBeNull()
    expect(nav.querySelector('a[href="/recommendations"]')).toBeNull()
  })
})
