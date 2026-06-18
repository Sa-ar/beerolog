import { CatalogIcon } from '@beerolog/icons'
import { Link } from '@tanstack/react-router'
import { Button, Card } from '@beerolog/ui'
import { StatusCard } from './StatusCard'

const JOURNEY_STEPS = [
  {
    step: 'quiz' as const,
    title: 'Quick taste quiz',
    detail: 'Seven everyday questions — no beer jargon.',
  },
  {
    step: 'vibe' as const,
    title: "Tonight's vibe",
    detail: 'Refreshing or cozy, low or high ABV.',
  },
  {
    step: 'picks' as const,
    title: 'Your top 5 picks',
    detail: 'Matched to your saved taste profile.',
  },
]

type TasteProfileEmptyStateProps = {
  greeting: string
}

export function TasteProfileEmptyState({ greeting }: TasteProfileEmptyStateProps) {
  return (
    <div className="flex flex-col gap-8">
      <section className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
          {greeting}
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
          Let&apos;s learn how you taste
        </h1>
        <p className="text-lg text-neutral-600">
          A short quiz about coffee, snacks, and everyday flavors — we&apos;ll turn it into
          beer picks you&apos;ll actually enjoy.
        </p>
      </section>

      <StatusCard
        variant="empty"
        title="No taste profile yet"
        description="Takes about 30 seconds. No beer knowledge required."
        illustration={
          <CatalogIcon
            group="marketing"
            iconKey="taste-quiz-hero"
            className="h-36 w-44"
          />
        }
        action={
          <Link to="/onboarding" className="w-full max-w-xs">
            <Button className="w-full" size="lg">
              Start the taste quiz →
            </Button>
          </Link>
        }
      />

      <section className="space-y-4">
        <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-neutral-500">
          What happens next
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {JOURNEY_STEPS.map((item, index) => (
            <Card
              key={item.title}
              className="flex flex-col items-center gap-2 p-4 text-center transition-colors hover:border-brand-300 hover:bg-brand-50/50"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                {index + 1}
              </span>
              <CatalogIcon group="journey" iconKey={item.step} className="h-9 w-9" />
              <div>
                <p className="font-medium text-neutral-900">{item.title}</p>
                <p className="mt-1 text-xs text-neutral-600">{item.detail}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
