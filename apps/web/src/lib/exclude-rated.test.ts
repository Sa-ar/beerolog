import { describe, expect, it } from 'vitest'
import { RATINGS } from '@beerolog/types'
import { excludeRated } from './exclude-rated'

const beers = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]

describe('excludeRated', () => {
  it('drops already-rated beers, preserving match-first order', () => {
    const ratings = { b: RATINGS.loved, d: RATINGS.disliked }
    expect(excludeRated(beers, ratings).map((x) => x.id)).toEqual(['a', 'c'])
  })

  it('returns the list unchanged when nothing is rated', () => {
    expect(excludeRated(beers, {}).map((x) => x.id)).toEqual(['a', 'b', 'c', 'd'])
  })
})
