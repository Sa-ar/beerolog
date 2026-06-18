import { Link } from '@tanstack/react-router'
import { Button } from '@beerolog/ui'
import { StatusCard } from './StatusCard'

export function NotFoundPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-12 sm:px-6 sm:py-16">
      <StatusCard
        variant="notFound"
        title="Wrong bar, wrong beer"
        description="Double-check the link, or let Beerolog guide you back to picks you'll enjoy."
        action={
          <Link to="/" className="w-full max-w-xs">
            <Button className="w-full" size="lg">
              Back to home →
            </Button>
          </Link>
        }
      />
    </main>
  )
}
