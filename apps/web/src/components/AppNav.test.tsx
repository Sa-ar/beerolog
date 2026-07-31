import { screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../test/render'

const routerState = vi.hoisted(() => ({ pathname: '/' }))

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
    select({ location: { pathname: routerState.pathname } }),
}))

vi.mock('@clerk/tanstack-react-start', () => ({
  Show: ({ when, children }: { when: string; children: ReactNode }) =>
    when === 'signed-in' ? <>{children}</> : null,
}))

vi.mock('@beerolog/icons', () => ({
  CatalogIcon: () => <span data-testid="nav-icon" />,
  BackIcon: () => <span data-testid="back-icon" />,
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
  beforeEach(() => {
    routerState.pathname = '/'
  })

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
    expect(nav.querySelectorAll('a')).toHaveLength(3)
    expect(nav.querySelector('a[href="/rate"]')).toHaveTextContent(/What I know/)
    expect(nav.querySelector('a[href="/rate"]')).toHaveTextContent(/Rate beers you recognize/)
    expect(nav.querySelector('a[href="/"]')).toHaveTextContent(/What I want/)
    expect(nav.querySelector('a[href="/"]')).toHaveTextContent(/Highest-match picks/)
    expect(nav.querySelector('a[href="/menu"]')).toHaveTextContent(/Scan/)
    expect(nav.querySelector('a[href="/menu"]')).toHaveTextContent(/Snap a menu/)
    expect(screen.getByText('Your decks')).toBeInTheDocument()
    expect(nav.querySelector('a[href="/recommendations"]')).toBeNull()
    expect(nav.querySelector('a[href="/account/profile"]')).toBeNull()
    expect(screen.getByTestId('user-menu')).toHaveAttribute('data-placement', 'up')
  })

  it('swaps the desktop sidebar to account destinations while on /account', () => {
    routerState.pathname = '/account/profile'
    renderWithI18n(<AppSidebar />, 'en')
    const nav = screen.getByRole('navigation', { name: 'Account' })
    expect(screen.getByRole('link', { name: /back to decks/i })).toHaveAttribute('href', '/')
    expect(screen.getByTestId('back-icon')).toBeInTheDocument()
    expect(screen.getByText('Your account')).toBeInTheDocument()
    expect(nav.querySelector('a[href="/account/profile"]')).toHaveAttribute('aria-current', 'page')
    expect(nav.querySelector('a[href="/account/collection"]')).toBeInTheDocument()
    expect(nav.querySelector('a[href="/account/details"]')).toBeInTheDocument()
    expect(nav.querySelector('a[href="/account/security"]')).toBeInTheDocument()
    expect(nav.querySelector('a[href="/account/settings"]')).toBeInTheDocument()
    expect(nav.querySelector('a[href="/rate"]')).toBeNull()
    expect(screen.queryByRole('navigation', { name: 'Primary' })).not.toBeInTheDocument()
  })

  it('shows the same three destinations in the mobile bottom bar', () => {
    renderWithI18n(<AppBottomNav />, 'en')
    const nav = screen.getByRole('navigation', { name: 'Primary' })
    expect(nav.querySelectorAll('a')).toHaveLength(3)
    expect(nav.querySelector('a[href="/rate"]')).toHaveTextContent('What I know')
    expect(nav.querySelector('a[href="/"]')).toHaveTextContent('What I want')
    expect(nav.querySelector('a[href="/menu"]')).toHaveTextContent('Scan')
    expect(nav.querySelector('a[href="/recommendations"]')).toBeNull()
  })
})
