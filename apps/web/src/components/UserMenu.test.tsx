import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../test/render'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
    role,
    onClick,
    'aria-current': ariaCurrent,
  }: {
    to: string
    children: ReactNode
    role?: string
    onClick?: () => void
    'aria-current'?: 'page' | undefined
  }) => (
    <a href={to} role={role} onClick={onClick} aria-current={ariaCurrent}>
      {children}
    </a>
  ),
  useRouterState: ({ select }: { select: (s: { location: { pathname: string } }) => string }) =>
    select({ location: { pathname: '/account/profile' } }),
}))

vi.mock('@clerk/tanstack-react-start', () => ({
  useUser: () => ({
    user: {
      fullName: 'Ada Lovelace',
      firstName: 'Ada',
      username: 'ada',
      primaryEmailAddress: { emailAddress: 'ada@example.com' },
      hasImage: false,
      imageUrl: '',
    },
  }),
  useClerk: () => ({
    signOut: vi.fn(),
  }),
}))

const { UserMenu } = await import('./UserMenu')

describe('UserMenu', () => {
  it('lists every account destination plus Log out', async () => {
    const user = userEvent.setup()
    renderWithI18n(<UserMenu />, 'en')
    await user.click(screen.getByRole('button', { name: /account menu/i }))
    expect(screen.getByRole('menuitem', { name: 'Profile' })).toHaveAttribute(
      'href',
      '/account/profile',
    )
    expect(screen.getByRole('menuitem', { name: 'Collection' })).toHaveAttribute(
      'href',
      '/account/collection',
    )
    expect(screen.getByRole('menuitem', { name: 'Details' })).toHaveAttribute(
      'href',
      '/account/details',
    )
    expect(screen.getByRole('menuitem', { name: 'Security' })).toHaveAttribute(
      'href',
      '/account/security',
    )
    expect(screen.getByRole('menuitem', { name: 'Settings' })).toHaveAttribute(
      'href',
      '/account/settings',
    )
    expect(screen.getByRole('menuitem', { name: /log out/i })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Account' })).not.toBeInTheDocument()
  })

  it('keeps the header trigger avatar-only (no name/email until menu opens)', () => {
    renderWithI18n(<UserMenu />, 'en')
    expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument()
    expect(screen.queryByText('ada@example.com')).not.toBeInTheDocument()
  })

  it('shows name and email on the sidebar trigger when available', () => {
    renderWithI18n(<UserMenu menuPlacement="up" />, 'en')
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('ada@example.com')).toBeInTheDocument()
  })

  it('does not repeat name/email in the sidebar dropdown', async () => {
    const user = userEvent.setup()
    renderWithI18n(<UserMenu menuPlacement="up" />, 'en')
    await user.click(screen.getByRole('button', { name: /account menu/i }))
    expect(screen.getAllByText('Ada Lovelace')).toHaveLength(1)
    expect(screen.getAllByText('ada@example.com')).toHaveLength(1)
    expect(screen.getByRole('menuitem', { name: 'Profile' })).toBeInTheDocument()
  })

  it('shows name and email in the header dropdown when the trigger is avatar-only', async () => {
    const user = userEvent.setup()
    renderWithI18n(<UserMenu />, 'en')
    await user.click(screen.getByRole('button', { name: /account menu/i }))
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('ada@example.com')).toBeInTheDocument()
  })
})
