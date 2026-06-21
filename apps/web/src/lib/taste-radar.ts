// Pure geometry for an N-axis radar/spider chart. No React, no DOM — returns
// coordinates the SVG component renders. Axes are evenly spaced clockwise from
// straight up; each value (0..1) is plotted along its spoke.

export type RadarAxis = { key: string; value: number }

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

export type RadarGeometry = {
  cx: number
  cy: number
  r: number
  valuePoints: [number, number][]
  axisPoints: [number, number][]
}

export function radarGeometry(axes: RadarAxis[], size = 220, pad = 28): RadarGeometry {
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - pad
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
  }
}

export function toPointsString(points: [number, number][]): string {
  return points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
}
