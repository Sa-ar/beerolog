import * as React from 'react'
import { cn } from '../lib/utils'

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Semantic level (h1–h6). Keep one h1 per page. */
  level?: HeadingLevel
}

// Semantic heading with a shared visual base; pages tune size/tracking via
// className (twMerge lets overrides win). One <Heading level={1}> per page.
export function Heading({ level = 1, className, ...props }: HeadingProps) {
  const Tag = `h${level}` as const
  return <Tag className={cn('font-bold tracking-tight text-neutral-900', className)} {...props} />
}

export interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  as?: 'p' | 'span'
  muted?: boolean
}

export function Text({ as: Tag = 'p', muted, className, ...props }: TextProps) {
  return <Tag className={cn(muted && 'text-neutral-600', className)} {...props} />
}
