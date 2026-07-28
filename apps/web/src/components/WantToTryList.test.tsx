import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../test/render'
import type { WantToTryItem } from '../lib/use-want-to-try'

const { removeSpy } = vi.hoisted(() => ({ removeSpy: vi.fn() }))

const items: WantToTryItem[] = [
  {
    beer_id: 'a',
    beer_name: 'Aleph',
    beer_brewery: 'X',
    beer_image_url: null,
    state: 'want',
    created_at: '1',
  },
  {
    beer_id: 'b',
    beer_name: 'Bet',
    beer_brewery: 'Y',
    beer_image_url: null,
    state: 'must_try',
    created_at: '2',
  },
]

vi.mock('../lib/use-want-to-try', () => ({
  useWantToTryList: () => ({ data: items }),
  useRemoveWantToTry: () => ({ mutate: removeSpy }),
}))

const { WantToTryList } = await import('./WantToTryList')

describe('WantToTryList', () => {
  it('pins must-try first and removes on click', async () => {
    const user = userEvent.setup()
    renderWithI18n(<WantToTryList />, 'en')

    const names = screen.getAllByRole('listitem').map((li) => li.textContent)
    expect(names[0]).toContain('Bet') // must_try pinned first
    expect(names[1]).toContain('Aleph')

    await user.click(screen.getByRole('button', { name: /remove aleph/i }))
    expect(removeSpy).toHaveBeenCalledWith('a')
  })
})
