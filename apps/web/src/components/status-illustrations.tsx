import type { ReactNode } from 'react'

export function NotFoundIllustration() {
  return (
    <svg viewBox="0 0 200 160" className="h-36 w-44" aria-hidden role="img">
      <ellipse cx="100" cy="148" rx="56" ry="8" fill="hsl(38 92% 90%)" />
      <g transform="rotate(6 100 96)">
        <rect
          x="68"
          y="52"
          width="64"
          height="84"
          rx="8"
          fill="hsl(38 92% 96%)"
          stroke="hsl(25 85% 50%)"
          strokeWidth="2"
        />
        <path
          d="M68 72 Q100 62 132 72"
          fill="none"
          stroke="hsl(25 85% 50%)"
          strokeWidth="2"
          opacity="0.5"
        />
        <ellipse cx="100" cy="76" rx="24" ry="5" fill="hsl(25 85% 50%)" opacity="0.12" />
        <path
          d="M132 72 L148 88 L148 136 L132 136 Z"
          fill="hsl(38 92% 90%)"
          stroke="hsl(25 85% 50%)"
          strokeWidth="2"
        />
      </g>
      <g transform="translate(42, 28)">
        <circle cx="0" cy="0" r="24" fill="hsl(38 92% 90%)" stroke="hsl(25 85% 50%)" strokeWidth="2" />
        <text
          x="0"
          y="8"
          textAnchor="middle"
          fontSize="18"
          fontWeight="700"
          fill="hsl(25 85% 43%)"
        >
          404
        </text>
      </g>
      <path
        d="M156 40 Q168 32 176 44"
        fill="none"
        stroke="hsl(25 85% 43%)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.35"
      />
      <path
        d="M164 52 Q176 44 184 56"
        fill="none"
        stroke="hsl(25 85% 43%)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.2"
      />
      <circle cx="158" cy="118" r="4" fill="hsl(25 85% 50%)" opacity="0.25" />
      <circle cx="172" cy="108" r="3" fill="hsl(25 85% 50%)" opacity="0.18" />
      <circle cx="166" cy="128" r="2.5" fill="hsl(25 85% 50%)" opacity="0.15" />
    </svg>
  )
}

export function ErrorIllustration() {
  return (
    <svg viewBox="0 0 200 160" className="h-36 w-44" aria-hidden role="img">
      <ellipse cx="100" cy="148" rx="56" ry="8" fill="hsl(38 92% 90%)" />
      <g transform="rotate(-8 100 96)">
        <rect
          x="62"
          y="48"
          width="76"
          height="88"
          rx="10"
          fill="hsl(38 92% 96%)"
          stroke="hsl(25 85% 50%)"
          strokeWidth="2"
        />
        <path
          d="M62 68 Q100 58 138 68"
          fill="none"
          stroke="hsl(25 85% 50%)"
          strokeWidth="2"
          opacity="0.5"
        />
        <ellipse cx="100" cy="72" rx="30" ry="6" fill="hsl(25 85% 50%)" opacity="0.15" />
      </g>
      <g transform="translate(138, 24)">
        <circle cx="0" cy="0" r="22" fill="hsl(0 86% 97%)" stroke="hsl(0 65% 40%)" strokeWidth="2" />
        <path
          d="M0 -8 L0 2"
          fill="none"
          stroke="hsl(0 65% 40%)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="0" cy="8" r="1.5" fill="hsl(0 65% 40%)" />
      </g>
      <path
        d="M36 52 Q28 40 40 32"
        fill="none"
        stroke="hsl(25 85% 43%)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.4"
      />
      <path
        d="M44 44 Q36 32 48 24"
        fill="none"
        stroke="hsl(25 85% 43%)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.25"
      />
    </svg>
  )
}

export function EmptyIllustration() {
  return (
    <svg viewBox="0 0 200 160" className="h-36 w-44" aria-hidden role="img">
      <ellipse cx="100" cy="148" rx="56" ry="8" fill="hsl(38 92% 90%)" />
      <g transform="translate(100, 96)">
        <rect
          x="-36"
          y="-44"
          width="72"
          height="88"
          rx="10"
          fill="hsl(38 92% 96%)"
          stroke="hsl(25 85% 50%)"
          strokeWidth="2"
        />
        <path
          d="M-36 -24 Q0 -34 36 -24"
          fill="none"
          stroke="hsl(25 85% 50%)"
          strokeWidth="2"
          opacity="0.5"
        />
        <ellipse cx="0" cy="-20" rx="28" ry="5" fill="hsl(25 85% 50%)" opacity="0.1" />
        <path
          d="M36 -24 L52 -8 L52 44 L36 44 Z"
          fill="hsl(38 92% 90%)"
          stroke="hsl(25 85% 50%)"
          strokeWidth="2"
        />
      </g>
      <g transform="translate(100, 32)">
        <circle cx="0" cy="0" r="20" fill="hsl(38 92% 90%)" stroke="hsl(25 85% 50%)" strokeWidth="2" />
        <path
          d="M-8 0 L8 0 M0 -8 L0 8"
          fill="none"
          stroke="hsl(25 85% 43%)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  )
}

export type StatusVariant = 'error' | 'empty' | 'notFound'

export function StatusIllustration({
  variant,
  illustration,
}: {
  variant: StatusVariant
  illustration?: ReactNode
}) {
  if (illustration) return illustration

  switch (variant) {
    case 'notFound':
      return <NotFoundIllustration />
    case 'error':
      return <ErrorIllustration />
    case 'empty':
      return <EmptyIllustration />
  }
}
