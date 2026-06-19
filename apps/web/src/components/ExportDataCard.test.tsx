import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../test/render'

const getMock = vi.fn()

vi.mock('../lib/api-client/client', () => ({
  apiClient: { GET: (...args: unknown[]) => getMock(...args) },
}))

const { ExportDataCard } = await import('./ExportDataCard')

beforeEach(() => {
  getMock.mockReset()
  getMock.mockResolvedValue({
    data: { id: 'u1', email: 'taster@example.com', baseline_taste: null, ratings: [] },
  })
})

describe('ExportDataCard', () => {
  it('fetches the export and shows the downloadable JSON on click', async () => {
    const user = userEvent.setup()
    renderWithI18n(<ExportDataCard />, 'en')
    await user.click(screen.getByRole('button', { name: /export/i }))

    expect(getMock).toHaveBeenCalledWith('/me/export')
    expect(await screen.findByText(/taster@example.com/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /download/i })).toHaveAttribute(
      'download',
      expect.stringContaining('.json'),
    )
  })
})
