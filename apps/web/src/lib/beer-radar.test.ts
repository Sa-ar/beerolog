import { describe, expect, it } from 'vitest'
import { beerSensoryAxes, tasteOverlayAxes } from './beer-radar'

const bitterness = (axes: { key: string; value: number }[]) =>
  axes.find((a) => a.key === 'bitterness')?.value

describe('beerSensoryAxes', () => {
  it('maps a high-IBU beer to more bitterness than a low-IBU beer', () => {
    const hoppy = beerSensoryAxes({ ibu: 60, abv: 5, adventurousness: 0.5 })
    const mild = beerSensoryAxes({ ibu: 6, abv: 5, adventurousness: 0.5 })
    expect(bitterness(hoppy)!).toBeGreaterThan(bitterness(mild)!)
    expect(bitterness(hoppy)!).toBeCloseTo(1)
  })

  it('maps ABV to strength across the session band and clamps the extremes', () => {
    const strength = (abv: number) =>
      beerSensoryAxes({ ibu: 30, abv, adventurousness: 0.5 }).find((a) => a.key === 'strength')!
        .value
    expect(strength(3)).toBeCloseTo(0)
    expect(strength(9)).toBeCloseTo(1)
    expect(strength(1)).toBe(0) // clamped, no negative
    expect(strength(12)).toBe(1) // clamped, no >1
  })

  it('passes adventurousness through unchanged (already 0..1)', () => {
    const adv = beerSensoryAxes({ ibu: 30, abv: 5, adventurousness: 0.7 }).find(
      (a) => a.key === 'adventurousness',
    )!.value
    expect(adv).toBeCloseTo(0.7)
  })

  it('omits the bitterness axis when ibu is null (never plots a guess)', () => {
    const axes = beerSensoryAxes({ ibu: null, abv: 5, adventurousness: 0.5 })
    expect(axes.map((a) => a.key)).toEqual(['strength', 'adventurousness'])
  })
})

describe('tasteOverlayAxes', () => {
  it('maps baseline dials onto the beer axis keys in the same order', () => {
    const axes = tasteOverlayAxes({ bitterness: 0.9, abv_affinity: 0.2, novelty_affinity: 0.7 })
    expect(axes.map((a) => a.key)).toEqual(['bitterness', 'strength', 'adventurousness'])
    const val = (k: string) => axes.find((a) => a.key === k)!.value
    expect(val('bitterness')).toBeCloseTo(0.9)
    expect(val('strength')).toBeCloseTo(0.2)
    expect(val('adventurousness')).toBeCloseTo(0.7)
  })

  it('defaults strength to neutral 0.5 when abv_affinity is missing', () => {
    const axes = tasteOverlayAxes({ bitterness: 0.5, novelty_affinity: 0.5 })
    expect(axes.find((a) => a.key === 'strength')!.value).toBeCloseTo(0.5)
  })
})
