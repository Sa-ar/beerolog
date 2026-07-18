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
  }: {
    to: string
    children: ReactNode
    role?: string
    onClick?: () => void
  }) => (
    <a href={to} role={role} onClick={onClick}>
      {children}
    </a>
  ),
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
  it('shows Account and Log out only (no per-tab deep links)', async () => {
    const user = userEvent.setup()
    renderWithI18n(<UserMenu />, 'en')
    await user.click(screen.getByRole('button', { name: /account menu/i }))
    expect(screen.getByRole('menuitem', { name: 'Account' })).toHaveAttribute(
      'href',
      '/account/profile',
    )
    expect(screen.getByRole('menuitem', { name: /log out/i })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /security/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /settings/i })).not.toBeInTheDocument()
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
})
