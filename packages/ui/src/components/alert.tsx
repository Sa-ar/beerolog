import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/utils'

const alertVariants = cva(
  'flex gap-3 rounded-lg border p-4 text-sm',
  {
    variants: {
      variant: {
        error: 'border-danger-200 bg-danger-50 text-danger-700',
        warning: 'border-brand-200 bg-warning-50 text-brand-900',
        info: 'border-brand-200 bg-brand-50 text-neutral-700',
      },
    },
    defaultVariants: {
      variant: 'error',
    },
  },
)

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string
  onRetry?: () => void
}

function AlertIcon({ variant }: { variant: 'error' | 'warning' | 'info' | null | undefined }) {
  if (variant === 'info') {
    return (
      <svg
        viewBox="0 0 20 20"
        className="mt-0.5 h-5 w-5 shrink-0 text-brand-600"
        aria-hidden
      >
        <circle cx="10" cy="10" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M10 9v5M10 6.5v.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    )
  }

  return (
    <svg
      viewBox="0 0 20 20"
      className={cn(
        'mt-0.5 h-5 w-5 shrink-0',
        variant === 'warning' ? 'text-brand-600' : 'text-danger-700',
      )}
      aria-hidden
    >
      <path
        d="M10 2.5L18 17H2L10 2.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M10 8v4M10 15.5v.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, title, children, onRetry, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      <AlertIcon variant={variant} />
      <div className="min-w-0 flex-1 space-y-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className={title ? 'text-[0.9375rem] leading-relaxed opacity-90' : undefined}>
          {children}
        </div>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 cursor-pointer text-sm font-medium underline underline-offset-2 hover:no-underline"
          >
            Try again
          </button>
        ) : null}
      </div>
    </div>
  ),
)
Alert.displayName = 'Alert'
