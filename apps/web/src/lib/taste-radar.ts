// Pure geometry for an N-axis radar/spider chart. No React, no DOM — returns
// coordinates the SVG component renders. Axes are evenly spaced clockwise from
// straight up; each value (0..1) is plotted along its spoke.

export type RadarAxis = { key: string; value: number }

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export type LabelPlacement = {
  textAnchor: 'start' | 'middle' | 'end'
  dominantBaseline: 'auto' | 'middle' | 'hanging'
}

export type RadarGeometry = {
  cx: number
  cy: number
  r: number
  valuePoints: [number, number][]
  axisPoints: [number, number][]
  labelPoints: [number, number][]
  labelPlacements: LabelPlacement[]
}

// Center every label on its spoke tip. Cardinal quadrant anchors break on 8-axis
// charts (45° spokes land in the wrong sector, e.g. lower-left reads as "top").
export function labelPlacement(_angle: number): LabelPlacement {
  return { textAnchor: 'middle', dominantBaseline: 'middle' }
}

export function radarGeometry(axes: RadarAxis[], size = 260, pad = 38): RadarGeometry {
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - pad
  const labelOffset = 20
  const n = axes.length
  const angleFor = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n
  const point = (i: number, radius: number): [number, number] => [
    cx + radius * Math.cos(angleFor(i)),
    cy + radius * Math.sin(angleFor(i)),
  ]
  return {
    cx,
    cy,
    r,
    valuePoints: axes.map((a, i) => point(i, r * clamp01(a.value))),
    axisPoints: axes.map((_, i) => point(i, r)),
    labelPoints: axes.map((_, i) => point(i, r + labelOffset)),
    labelPlacements: axes.map((_, i) => labelPlacement(angleFor(i))),
  }
}

export function toPointsString(points: [number, number][]): string {
  return points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
}

export function distanceFromCenter(cx: number, cy: number, point: [number, number]): number {
  const [x, y] = point
  return Math.hypot(x - cx, y - cy)
}
