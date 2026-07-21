import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithI18n } from '../test/render'
import { BeerDetail, type BeerDetailData } from './BeerDetail'

const base: BeerDetailData = {
  name: 'Alexander Blazer',
  brewery: 'Alexander',
  style: 'American IPA',
  abv: 6.2,
  market_tier: 'craft',
  color: 'amber',
  ibu: 60,
  adventurousness: 0.55,
  why: 'Bright and hoppy, like you.',
}

describe('BeerDetail', () => {
  it('renders the sensory radar and the beer facts', () => {
    renderWithI18n(<BeerDetail beer={base} />, 'en')
    expect(screen.getByTestId('taste-radar')).toBeInTheDocument()
    expect(screen.getByText('Alexander Blazer')).toBeInTheDocument()
    expect(screen.getByText('Alexander')).toBeInTheDocument()
    expect(screen.getByText(/Bright and hoppy/)).toBeInTheDocument()
  })

  it('shows body and sweetness chips when present', () => {
    renderWithI18n(<BeerDetail beer={{ ...base, body: 'full', sweetness: 'dry' }} />, 'en')
    expect(screen.getByText('Full body')).toBeInTheDocument()
    expect(screen.getByText('Dry finish')).toBeInTheDocument()
  })

  it('omits body and sweetness chips when absent', () => {
    renderWithI18n(<BeerDetail beer={{ ...base, body: null, sweetness: null }} />, 'en')
    expect(screen.queryByText('Full body')).toBeNull()
    expect(screen.queryByText(/finish/)).toBeNull()
  })
})
