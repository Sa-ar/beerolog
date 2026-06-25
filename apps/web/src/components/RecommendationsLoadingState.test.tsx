import { act, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import en from '../i18n/locales/en/common.json'
import { renderWithI18n } from '../test/render'
import { RecommendationsLoadingState } from './RecommendationsLoadingState'

const PHRASES = en.recommendations.thinking as [string, string, ...string[]]

describe('RecommendationsLoadingState thinking line', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('cycles through thinking phrases over time', () => {
    vi.useFakeTimers()
    renderWithI18n(<RecommendationsLoadingState />)
    expect(screen.getByText(PHRASES[0])).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(1800)
    })
    expect(screen.getByText(PHRASES[1])).toBeInTheDocument()
  })

  it('holds on the first phrase under prefers-reduced-motion', () => {
    vi.useFakeTimers()
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    renderWithI18n(<RecommendationsLoadingState />)
    act(() => {
      vi.advanceTimersByTime(PHRASES.length * 1800)
    })
    expect(screen.getByText(PHRASES[0])).toBeInTheDocument()
  })
})
