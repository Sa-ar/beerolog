import { useId } from 'react'
import type { BeerColor } from '../lib/beer-color'
import { BEER_COLOR_FILL, BEER_COLOR_GLOW, BEER_COLOR_LABEL } from '../lib/beer-color'

const GLASS_STROKE = 'hsl(25 45% 22%)'

/** Outer pint silhouette — matches the catalog ABV glass proportions. */
const GLASS_OUTLINE =
  'M12 7h8l-1.5 17c0 1.3-1.1 2.3-2.5 2.3s-2.5-1-2.5-2.3L12 7z'

/** Pint glass whose liquid fill encodes how dark the beer is. */
export function BeerColorGlass({
  color,
  className = 'h-11 w-11',
}: {
  color: BeerColor
  className?: string
}) {
  const clipId = useId()
  const fill = BEER_COLOR_FILL[color]
  const label = BEER_COLOR_LABEL[color]
  const foamFill = color === 'dark' ? 'hsl(48 18% 82%)' : 'hsl(48 35% 96%)'

  return (
    <span
      className="inline-flex items-center justify-center rounded-2xl ring-1 ring-neutral-200/80"
      style={{ backgroundColor: BEER_COLOR_GLOW[color] }}
      title={`${label} beer`}
    >
      <svg
        viewBox="0 0 32 32"
        className={className}
        role="img"
        aria-label={`${label} beer color`}
      >
        <defs>
          <clipPath id={clipId}>
            <path d={GLASS_OUTLINE} />
          </clipPath>
        </defs>

        {/* Liquid clipped to the glass interior */}
        <g clipPath={`url(#${clipId})`}>
          <rect x="11" y="14" width="10" height="14" fill={fill} />
          <ellipse cx="16" cy="13.2" rx="4.1" ry="1.35" fill={foamFill} />
          <path
            d="M11.5 14.5 Q16 13.1 20.5 14.5"
            fill="none"
            stroke={GLASS_STROKE}
            strokeWidth="0.6"
            opacity="0.2"
          />
        </g>

        {/* Glass shell */}
        <path
          d={GLASS_OUTLINE}
          fill="hsl(0 0% 100% / 0.15)"
          stroke={GLASS_STROKE}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M12 7h8"
          stroke={GLASS_STROKE}
          strokeWidth="1.25"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>
    </span>
  )
}
