import { ICON_STYLE } from '@beerolog/icons'

const STROKE = ICON_STYLE.stroke
const FILL_LIGHT = ICON_STYLE.fillLight
const FILL_MID = ICON_STYLE.fillMid
const BEER = ICON_STYLE.flavorAccent.malty
const W = ICON_STYLE.strokeWidth

type IconProps = {
  className?: string
}

/** Navbar brand mark — beer stein with handle, foam head, and amber fill. */
export function BeerologMark({ className = 'h-7 w-7' }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={`block ${className}`} aria-hidden>
      {/* Handle */}
      <path
        d="M22 11h2.5c1.5 0 2.5 1.2 2.5 2.8v4.4c0 1.6-1 2.8-2.5 2.8H22"
        stroke={STROKE}
        strokeWidth={W}
        fill="none"
        strokeLinecap="round"
      />

      {/* Stein body */}
      <path
        d="M10 9h12v15c0 2.5-2.5 4.5-6 4.5s-6-2-6-4.5V9z"
        fill={FILL_LIGHT}
        stroke={STROKE}
        strokeWidth={W}
        strokeLinejoin="round"
      />

      {/* Beer */}
      <path
        d="M10.75 14.5h10.5v8.2c0 1.7-2 3-5.25 3s-5.25-1.3-5.25-3v-8.2z"
        fill={BEER}
      />

      {/* Rim */}
      <path d="M10 14h12" stroke={STROKE} strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />

      {/* Foam head */}
      <circle cx="13" cy="9.5" r="2" fill={FILL_MID} stroke={STROKE} strokeWidth="1.25" />
      <circle cx="16.5" cy="8.5" r="2.2" fill="white" stroke={STROKE} strokeWidth="1.25" />
      <circle cx="20" cy="9.5" r="1.8" fill={FILL_MID} stroke={STROKE} strokeWidth="1.25" />
    </svg>
  )
}
