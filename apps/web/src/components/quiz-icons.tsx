import type { ReactNode } from 'react'

// Chalk-line glyphs for quiz option cards. Stroke-only, `currentColor` so they
// inherit the card ink (dark on the gold selected card, cream otherwise).
// `QuizIcon` returns null for any option without art, so cards fall back to
// text-only. Style matches @beerolog/icons (hand-drawn, round joins).

function Svg({ children, className }: { children: ReactNode; className?: string | undefined }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  )
}

// Rising bars; `level` of them filled. Used for every intensity scale, which
// also gives those questions the left→right visual ramp (research item D5).
function Intensity({ level }: { level: number }) {
  return (
    <>
      {[
        { x: 4, h: 5 },
        { x: 10, h: 9 },
        { x: 16, h: 13 },
      ].map((b, i) => (
        <rect
          key={b.x}
          x={b.x}
          y={19 - b.h}
          width="4"
          height={b.h}
          rx="1.3"
          fill={i < level ? 'currentColor' : 'none'}
        />
      ))}
    </>
  )
}

// Scale groups → 1-3 intensity. Ordered by the dimension's magnitude.
const SCALE: Record<string, Record<string, number>> = {
  fizz: { still: 1, light: 2, strong: 3 },
  strength: { light: 1, medium: 2, strong: 3 },
  sweet: { dry: 1, balanced: 2, rich: 3 },
  adventure: { low: 1, medium: 2, high: 3 },
}

const CUP = 'M6 9h10v3a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4z'
const BAR = 'M6 5h12v14a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19z'

// Bespoke option glyphs, keyed `group:option`.
const GLYPHS: Record<string, ReactNode> = {
  // Coffee — a cup with a modifier.
  'coffee:black': (
    <>
      <path d={CUP} fill="currentColor" />
      <path d="M16 10h1.5a2 2 0 0 1 0 4H16" />
      <path d="M9 3c-1 1 1 2 0 3M13 3c-1 1 1 2 0 3" />
    </>
  ),
  'coffee:milk_based': (
    <>
      <path d={CUP} />
      <path d="M16 10h1.5a2 2 0 0 1 0 4H16" />
      <path d="M8 12c1.3-1.4 2.7 1.4 4 0" />
    </>
  ),
  'coffee:sweet': (
    <>
      <path d={CUP} />
      <path d="M16 10h1.5a2 2 0 0 1 0 4H16" />
      <rect x="9.5" y="3" width="4" height="4" rx="0.8" />
    </>
  ),
  'coffee:none': (
    <>
      <path d={CUP} />
      <path d="M16 10h1.5a2 2 0 0 1 0 4H16" />
      <path d="M5 4l14 14" />
    </>
  ),
  // Chocolate — a bar, darker = more fill.
  'choco:dark_90': <path d={BAR} fill="currentColor" />,
  'choco:dark_70': (
    <>
      <path d={BAR} />
      <path d="M6 12h12" />
    </>
  ),
  'choco:milk': (
    <>
      <path d={BAR} />
      <path d="M12 5v15M6 12h12" />
    </>
  ),
  'choco:none': (
    <>
      <path d={BAR} />
      <path d="M5 4l14 16" />
    </>
  ),
  // Like / neutral / avoid (sour & smoked foods share group 'love').
  'love:love': (
    <path
      d="M12 19s-6-4-6-8a3 3 0 0 1 6-1 3 3 0 0 1 6 1c0 4-6 8-6 8z"
      fill="currentColor"
    />
  ),
  'love:okay': (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M9 14.5h6M9.2 10h.01M14.8 10h.01" />
    </>
  ),
  'love:avoid': (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M6.5 6.5l11 11" />
    </>
  ),
  // Sour-wild branch.
  'sour_wild:bright': (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" />
    </>
  ),
  'sour_wild:funky': <path d="M3 13c2-5 4 5 6 0s4 5 6 0 2-5 3-2" />,
  // Avoid CATA (group 'avoid').
  'avoid:too_bitter': (
    <>
      <path d="M4 13a8 7 0 0 1 16 0z" />
      <path d="M12 6v7M8 13l4-7M16 13l-4-7" />
    </>
  ),
  'avoid:too_sweet': (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M8 12L4 9.5v5zM16 12l4-2.5v5z" />
    </>
  ),
  'avoid:too_heavy': <path d="M4 10v4M20 10v4M6.5 8v8M17.5 8v8M6.5 12h11" />,
  'avoid:too_dark': (
    <path d="M16.5 13a6 6 0 1 1-5.5-7 5 5 0 0 0 5.5 7z" fill="currentColor" />
  ),
  // Flavor cues (group 'cue').
  'cue:grapefruit': (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4v16M4 12h16M6.3 6.3l11.4 11.4M17.7 6.3L6.3 17.7" />
    </>
  ),
  'cue:caramel': (
    <path d="M12 4c3 5 5 7 5 10a5 5 0 0 1-10 0c0-3 2-5 5-10z" fill="currentColor" />
  ),
  'cue:pine': (
    <>
      <path d="M12 3l4 6h-2.5l3 5h-3l2 4H8.5l2-4h-3l3-5H8z" fill="currentColor" />
      <path d="M11 18h2v3h-2z" />
    </>
  ),
  'cue:tropical': (
    <>
      <path d="M9 9c0-3 6-3 6 0v5a3 3 0 0 1-6 0z" />
      <path d="M12 3l-2.5 4h5z" />
      <path d="M9.5 11.5h5M9.5 14h5" />
    </>
  ),
  'cue:banana_bread': (
    <>
      <path d="M5 15a7 4.5 0 0 1 14 0v1.5H5z" fill="currentColor" />
      <path d="M5 16.5h14" />
    </>
  ),
  'cue:citrus_zest': (
    <>
      <path d="M5 12a7 7 0 1 1 7 7" />
      <path d="M12 19c-2 0-3.2-1.4-3.2-3.2" />
    </>
  ),
  'cue:coffee': (
    <g transform="rotate(35 12 12)">
      <ellipse cx="12" cy="12" rx="4.5" ry="8" />
      <path d="M12 5c-2 4-2 10 0 14" />
    </g>
  ),
  'cue:bread_crust': (
    <>
      <path d="M6 13a6 5 0 0 1 12 0v5H6z" />
      <path d="M6 13h12" />
    </>
  ),
}

export function QuizIcon({
  group,
  option,
  className,
}: {
  group: string
  option: string
  className?: string
}) {
  const level = SCALE[group]?.[option]
  if (level) return <Svg className={className}>{<Intensity level={level} />}</Svg>
  const glyph = GLYPHS[`${group}:${option}`]
  if (!glyph) return null
  return <Svg className={className}>{glyph}</Svg>
}
