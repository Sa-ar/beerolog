import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../test/render'

const deleteMock = vi.fn()
const signOutMock = vi.fn()

vi.mock('../lib/api-client/client', () => ({
  apiClient: { DELETE: (...args: unknown[]) => deleteMock(...args) },
}))
vi.mock('@clerk/tanstack-react-start', () => ({
  useClerk: () => ({ signOut: signOutMock }),
}))

const { DeleteAccountCard } = await import('./DeleteAccountCard')

beforeEach(() => {
  deleteMock.mockReset()
  signOutMock.mockReset()
  deleteMock.mockResolvedValue({ data: { deleted: true } })
})

describe('DeleteAccountCard', () => {
  it('keeps the confirm action disabled until the exact phrase is typed', async () => {
    const user = userEvent.setup()
    renderWithI18n(<DeleteAccountCard />, 'en')
    await user.click(screen.getByRole('button', { name: /^delete account$/i }))

    const confirm = screen.getByRole('button', { name: /permanently delete/i })
    expect(confirm).toBeDisabled()

    await user.type(screen.getByLabelText(/delete my account/i), 'delete my account')
    expect(confirm).toBeEnabled()
  })

  it('calls DELETE /me then signs the user out on confirm', async () => {
    const user = userEvent.setup()
    renderWithI18n(<DeleteAccountCard />, 'en')
    await user.click(screen.getByRole('button', { name: /^delete account$/i }))
    await user.type(screen.getByLabelText(/delete my account/i), 'delete my account')
    await user.click(screen.getByRole('button', { name: /permanently delete/i }))

    expect(deleteMock).toHaveBeenCalledWith('/me')
    expect(signOutMock).toHaveBeenCalled()
  })

  it('disables the confirm button while the deletion is in flight', async () => {
    let resolve: (v: unknown) => void = () => {}
    deleteMock.mockReturnValue(new Promise((r) => (resolve = r)))
    const user = userEvent.setup()
    renderWithI18n(<DeleteAccountCard />, 'en')
    await user.click(screen.getByRole('button', { name: /^delete account$/i }))
    await user.type(screen.getByLabelText(/delete my account/i), 'delete my account')
    await user.click(screen.getByRole('button', { name: /permanently delete/i }))

    expect(screen.getByRole('button', { name: /deleting/i })).toBeDisabled()
    resolve({ data: { deleted: true } })
  })
})
