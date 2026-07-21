import type { RadarAxis } from './taste-radar'

// Canonical axis order for the beer sensory radar. The objective (beer) series
// and the personalized (taste) overlay both plot onto these keys so the two
// polygons align. ponytail: three axes because they are the only beer fields
// that are both ~100% populated in the catalog AND have a BaselineTaste dial
// counterpart for the overlay — body/sweetness are ~11% populated (shown as
// chips instead), color has no taste counterpart (shown as a swatch).
export const BEER_RADAR_AXIS_KEYS = ['bitterness', 'strength', 'adventurousness'] as const

// Normalization bands (tunable). IBU at/above IBU_FULL reads as full bitterness;
// ABV is mapped across a typical session range.
const IBU_FULL = 60
const ABV_MIN = 3
const ABV_MAX = 9

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export type BeerRadarInput = {
  ibu?: number | null
  abv: number
  adventurousness: number
}

/**
 * Objective sensory axes for a beer, each 0..1. Bitterness is omitted when `ibu`
 * is null (rare — ~0.3% of the catalog) so we never plot a guessed value; the
 * radar then renders with the remaining axes.
 */
export function beerSensoryAxes(beer: BeerRadarInput): RadarAxis[] {
  const axes: RadarAxis[] = []
  if (beer.ibu != null) {
    axes.push({ key: 'bitterness', value: clamp01(beer.ibu / IBU_FULL) })
  }
  axes.push({ key: 'strength', value: clamp01((beer.abv - ABV_MIN) / (ABV_MAX - ABV_MIN)) })
  axes.push({ key: 'adventurousness', value: clamp01(beer.adventurousness) })
  return axes
}

export type TasteOverlayInput = {
  bitterness: number
  abv_affinity?: number | null
  novelty_affinity: number
}

/**
 * The user's BaselineTaste dials mapped onto the same axis keys/order as
 * `beerSensoryAxes`, so the two polygons overlay cleanly. `abv_affinity`
 * (the strength counterpart) defaults to neutral 0.5 when absent on older
 * profiles. Callers align this to the beer's present axes (e.g. drop the
 * bitterness overlay when the beer has no ibu).
 */
export function tasteOverlayAxes(taste: TasteOverlayInput): RadarAxis[] {
  return [
    { key: 'bitterness', value: clamp01(taste.bitterness) },
    { key: 'strength', value: clamp01(taste.abv_affinity ?? 0.5) },
    { key: 'adventurousness', value: clamp01(taste.novelty_affinity) },
  ]
}
