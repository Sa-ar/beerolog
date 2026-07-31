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

describe('Account layout', () => {
  it('renders the account shell without a secondary tab navbar', () => {
    renderWithI18n(<AccountLayout />, 'en')
    expect(screen.getByRole('heading', { name: 'Account' })).toBeInTheDocument()
    expect(screen.getByTestId('outlet')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Account' })).not.toBeInTheDocument()
  })
})
