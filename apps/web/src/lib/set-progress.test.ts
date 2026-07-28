import { describe, expect, it } from 'vitest'
import { computeSetProgress } from './set-progress'

describe('computeSetProgress', () => {
  it('counts caught vs total and lists what is missing', () => {
    const p = computeSetProgress(['a', 'b', 'c'], ['a', 'c', 'zzz'])
    expect(p).toEqual({ caught: 2, total: 3, isComplete: false, missing: ['b'] })
  })

  it('is complete only when every set beer is caught', () => {
    expect(computeSetProgress(['a', 'b'], ['a', 'b', 'extra'])).toEqual({
      caught: 2,
      total: 2,
      isComplete: true,
      missing: [],
    })
  })

  it('is not complete (and not caught) when nothing is caught', () => {
    expect(computeSetProgress(['a', 'b'], [])).toEqual({
      caught: 0,
      total: 2,
      isComplete: false,
      missing: ['a', 'b'],
    })
  })

  it('dedups repeated set ids so total reflects unique beers', () => {
    expect(computeSetProgress(['a', 'a', 'b'], ['a'])).toEqual({
      caught: 1,
      total: 2,
      isComplete: false,
      missing: ['b'],
    })
  })

  it('an empty set is never complete', () => {
    expect(computeSetProgress([], ['a'])).toEqual({
      caught: 0,
      total: 0,
      isComplete: false,
      missing: [],
    })
  })
})
