import { Link } from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { Button } from '@beerolog/ui'
import { StatusCard } from './StatusCard'
import { globalErrorMessage } from '../lib/user-facing-errors'

export function GlobalErrorPage({ error, reset }: ErrorComponentProps) {
  if (import.meta.env.MODE === 'development') {
    console.error('[GlobalErrorPage]', error)
  }

  const { title, message } = globalErrorMessage()

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-12 sm:px-6 sm:py-16">
      <StatusCard
        variant="error"
        title={title}
        description={message}
        action={
          <div className="flex w-full max-w-xs flex-col gap-3">
            <Button className="w-full" size="lg" onClick={reset}>
              Try again
            </Button>
            <Link to="/" className="w-full">
              <Button className="w-full" size="lg" variant="outline">
                Back to home
              </Button>
            </Link>
          </div>
        }
      />
    </main>
  )
}
