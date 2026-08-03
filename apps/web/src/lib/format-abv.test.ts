import { describe, expect, it } from 'vitest'
import { formatAbv } from './format-abv'

describe('formatAbv', () => {
  it('keeps one decimal place', () => {
    expect(formatAbv(5.25)).toBe('5.3%')
  })

  it('drops trailing zeros', () => {
    expect(formatAbv(5)).toBe('5%')
    expect(formatAbv(5.0)).toBe('5%')
  })

  it('formats a single-decimal value verbatim', () => {
    expect(formatAbv(4.2)).toBe('4.2%')
  })
})
