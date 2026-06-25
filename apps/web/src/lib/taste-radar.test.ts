import { describe, expect, it } from 'vitest'
import { radarGeometry, toPointsString, type RadarAxis } from './taste-radar'

const AXES: RadarAxis[] = Array.from({ length: 8 }, (_, i) => ({
  key: `a${i}`,
  value: 0.5,
}))

describe('radarGeometry', () => {
  it('returns one value point and one axis point per axis', () => {
    const g = radarGeometry(AXES, 220)
    expect(g.valuePoints).toHaveLength(8)
    expect(g.axisPoints).toHaveLength(8)
  })

  it('plots value 0 at the center and value 1 on the outer radius', () => {
    const g = radarGeometry([{ key: 'x', value: 0 }], 200, 20)
    expect(g.valuePoints[0]?.[0]).toBeCloseTo(g.cx)
    expect(g.valuePoints[0]?.[1]).toBeCloseTo(g.cy)

    const full = radarGeometry([{ key: 'x', value: 1 }], 200, 20)
    // First axis points straight up: x == cx, y == cy - r.
    expect(full.valuePoints[0]?.[0]).toBeCloseTo(full.cx)
    expect(full.valuePoints[0]?.[1]).toBeCloseTo(full.cy - full.r)
  })

  it('clamps out-of-range values to the [0,1] radius', () => {
    const g = radarGeometry([{ key: 'x', value: 5 }], 200, 20)
    expect(g.valuePoints[0]?.[1]).toBeCloseTo(g.cy - g.r)
  })

  it('serializes points to an SVG points string', () => {
    expect(toPointsString([[1, 2], [3.456, 4]])).toBe('1.00,2.00 3.46,4.00')
  })
})
