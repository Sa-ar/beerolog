import { radarGeometry, toPointsString, type RadarAxis } from '../lib/taste-radar'

// Hand-rolled SVG radar (no chart dependency). Renders concentric rings, a spoke
// per axis, the filled value polygon, and a label at each axis tip.
export function TasteRadar({
  axes,
  labels,
  ariaLabel,
  size = 240,
}: {
  axes: RadarAxis[]
  labels: Record<string, string>
  ariaLabel: string
  size?: number
}) {
  const { cx, cy, r, valuePoints, axisPoints } = radarGeometry(axes, size)
  const rings = [0.25, 0.5, 0.75, 1]

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto h-auto w-full max-w-[16rem]"
      role="img"
      data-testid="taste-radar"
      aria-label={ariaLabel}
    >
      {rings.map((f) => (
        <circle key={f} cx={cx} cy={cy} r={r * f} className="fill-none stroke-amber-100" />
      ))}
      {axisPoints.map(([x, y], i) => (
        <line key={i} x1={cx} y1={cy} x2={x} y2={y} className="stroke-amber-100" />
      ))}
      <polygon
        points={toPointsString(valuePoints)}
        className="fill-brand-500/25 stroke-brand-600"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {valuePoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={2.5} className="fill-brand-600" />
      ))}
      {axisPoints.map(([x, y], i) => (
        <text
          key={i}
          x={x + (x > cx + 1 ? 4 : x < cx - 1 ? -4 : 0)}
          y={y + (y > cy + 1 ? 10 : y < cy - 1 ? -4 : 4)}
          textAnchor={x > cx + 1 ? 'start' : x < cx - 1 ? 'end' : 'middle'}
          className="fill-neutral-500 text-[9px] font-medium"
        >
          {labels[axes[i]?.key ?? ''] ?? axes[i]?.key}
        </text>
      ))}
    </svg>
  )
}
