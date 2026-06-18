import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../test/render'
import { QuizChips } from './QuizChips'

describe('QuizChips', () => {
  it('exposes a named radiogroup with the selected option checked', () => {
    renderWithI18n(
      <QuizChips
        title="How do you take coffee?"
        group="coffee"
        options={['black', 'milk']}
        value="black"
        onChange={vi.fn()}
      />,
      'en',
    )
    expect(screen.getByRole('radiogroup', { name: /coffee/i })).toBeInTheDocument()
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(2)
    expect(screen.getByRole('radio', { checked: true })).toBe(radios[0])
  })

  it('calls onChange when an option is chosen', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    renderWithI18n(
      <QuizChips
        title="How do you take coffee?"
        group="coffee"
        options={['black', 'milk']}
        value={null}
        onChange={onChange}
      />,
      'en',
    )
    await user.click(screen.getAllByRole('radio')[1]!)
    expect(onChange).toHaveBeenCalledWith('milk')
  })
})
