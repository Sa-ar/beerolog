import * as React from 'react'

interface ProgressRingProps {
  value: number
  max: number
  size?: number
  strokeWidth?: number
  label?: string
}

export function ProgressRing({
  value,
  max,
  size = 80,
  strokeWidth = 6,
  label,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = max === 0 ? 0 : Math.min(value / max, 1)
  const dashOffset = circumference * (1 - progress)

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-neutral-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className="text-brand-500 transition-all duration-500"
        />
      </svg>
      {label && (
        <span className="absolute text-xs font-semibold text-brand-900">{label}</span>
      )}
    </div>
  )
}
