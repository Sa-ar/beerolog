import { radarGeometry, toPointsString, type RadarAxis } from '../lib/taste-radar'

// Hand-rolled SVG radar (no chart dependency). Renders concentric rings, a spoke
// per axis, the filled value polygon, and a label outside each axis tip.
export function TasteRadar({
  axes,
  labels,
  ariaLabel,
  size = 260,
  overlay,
  seriesLabels,
}: {
  axes: RadarAxis[]
  labels: Record<string, string>
  ariaLabel: string
  size?: number
  /** Optional second series (e.g. the user's taste) drawn as a dashed polygon.
   *  Must share the axis order of `axes` so the polygons align. */
  overlay?: RadarAxis[] | undefined
  seriesLabels?: { primary: string; overlay: string } | undefined
}) {
  const { cx, cy, r, valuePoints, axisPoints, labelPoints, labelPlacements } = radarGeometry(
    axes,
    size,
  )
  const overlayPoints =
    overlay && overlay.length === axes.length ? radarGeometry(overlay, size).valuePoints : null
  const rings = [0.25, 0.5, 0.75, 1]

  return (
    <div className="mx-auto w-full max-w-[16rem]">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-auto w-full"
        role="img"
        data-testid="taste-radar"
        aria-label={ariaLabel}
      >
        {rings.map((f) => (
          <circle key={f} cx={cx} cy={cy} r={r * f} className="fill-none stroke-neutral-300/60" />
        ))}
        {axisPoints.map(([x, y], i) => (
          <line key={i} x1={cx} y1={cy} x2={x} y2={y} className="stroke-neutral-300/60" />
        ))}
        {overlayPoints ? (
          <polygon
            points={toPointsString(overlayPoints)}
            className="fill-none stroke-neutral-500"
            strokeWidth={2}
            strokeDasharray="4 3"
            strokeLinejoin="round"
            data-testid="taste-radar-overlay"
          />
        ) : null}
        <polygon
          points={toPointsString(valuePoints)}
          className="fill-brand-500/25 stroke-brand-600"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {valuePoints.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={2.5} className="fill-brand-600" />
        ))}
        {labelPoints.map(([x, y], i) => (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor={labelPlacements[i]?.textAnchor ?? 'middle'}
            dominantBaseline={labelPlacements[i]?.dominantBaseline ?? 'middle'}
            className="fill-neutral-600 text-[11px] font-semibold"
          >
            {labels[axes[i]?.key ?? ''] ?? axes[i]?.key}
          </text>
        ))}
      </svg>
      {overlayPoints && seriesLabels ? (
        <div className="mt-2 flex justify-center gap-4 text-[11px] text-neutral-600">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-3 rounded-sm bg-brand-500/40 ring-1 ring-brand-600"
              aria-hidden
            />
            {seriesLabels.primary}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0 w-3 border-t-2 border-dashed border-neutral-500" aria-hidden />
            {seriesLabels.overlay}
          </span>
        </div>
      ) : null}
    </div>
  )
}
