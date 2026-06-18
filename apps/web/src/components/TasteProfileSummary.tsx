import { Link } from '@tanstack/react-router'
import { CatalogIcon, GeneratedTasteIcon, resolveProfileHeroSvg } from '@beerolog/icons'
import { Badge, Button, Card } from '@beerolog/ui'
import {
  dialDescriptor,
  flavorTitle,
  noveltyLabel,
  topFlavorFamilies,
  type BaselineTaste,
} from '../lib/baseline-taste'
import { SessionQuickPick } from './SessionQuickPick'

type TasteProfileSummaryProps = {
  greeting: string
  baseline: BaselineTaste
}

export function TasteProfileSummary({ greeting, baseline }: TasteProfileSummaryProps) {
  const flavors = topFlavorFamilies(baseline)
  const title = flavorTitle(baseline)
  const heroSvg = resolveProfileHeroSvg(baseline, baseline.icons)
  const updated = new Date(baseline.updated_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="flex flex-col gap-8">
      <section className="space-y-1">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
          {greeting}
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
          Ready for tonight?
        </h1>
      </section>

      <Card className="overflow-hidden border-brand-200 bg-gradient-to-br from-brand-50 via-white to-amber-50/80 p-0 shadow-md">
        <div className="flex items-start gap-4 p-6 pb-4">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-brand-100"
            aria-hidden
          >
            {heroSvg ? <GeneratedTasteIcon svg={heroSvg} className="h-9 w-9" /> : null}
          </span>
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
              Your taste profile
            </p>
            {title ? (
              <h2 className="text-2xl font-bold tracking-tight text-neutral-900">{title}</h2>
            ) : null}
            <p className="text-base text-neutral-600">{noveltyLabel(baseline)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 px-6 pb-4">
          {flavors.map((flavor) => (
            <Badge key={flavor.key} variant="default" className="gap-1.5">
              <CatalogIcon group="flavor" iconKey={flavor.key} className="h-4 w-4 shrink-0" />
              {flavor.label}
            </Badge>
          ))}
        </div>

        <div className="border-t border-brand-100/80 bg-white/60 px-6 py-3">
          <p className="text-xs text-neutral-500">Profile last updated {updated}</p>
        </div>
      </Card>

      <Card className="border-brand-200 bg-white p-6 shadow-sm">
        <SessionQuickPick baseline={baseline} />
      </Card>

      <Card className="space-y-5 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Your taste dials
        </h2>

        <div className="space-y-4">
          <TasteDial
            label="Carbonation"
            value={baseline.bubbles}
            low="Still"
            mid="Light fizz"
            high="Sparkling"
          />
          <TasteDial
            label="Bitterness"
            value={baseline.bitterness}
            low="Mild"
            mid="Balanced"
            high="Bold"
          />
          <TasteDial
            label="Novelty"
            value={baseline.novelty_affinity}
            low="Familiar"
            mid="Open"
            high="Adventurous"
          />
        </div>
      </Card>

      <section className="flex flex-col gap-3">
        <Link to="/onboarding">
          <Button className="w-full" size="md" variant="outline">
            Retake the taste quiz
          </Button>
        </Link>
        <p className="text-center text-xs text-neutral-500">
          Your picks and ratings keep refining what we recommend.
        </p>
      </section>
    </div>
  )
}

function TasteDial({
  label,
  value,
  low,
  mid,
  high,
}: {
  label: string
  value: number
  low: string
  mid: string
  high: string
}) {
  const descriptor = dialDescriptor(value, low, mid, high)
  const percent = Math.round(value * 100)

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-neutral-900">{label}</span>
        <span className="text-neutral-500">
          {descriptor} · {percent}%
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
