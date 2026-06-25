import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { CatalogIcon, GeneratedTasteIcon, resolveProfileHeroSvg } from '@beerolog/icons'
import { Badge, Button, Card } from '@beerolog/ui'
import {
  dialDescriptor,
  flavorTitle,
  noveltyLabel,
  personaForLang,
  topFlavorFamilies,
  type BaselineTaste,
} from '../lib/baseline-taste'
import { SessionQuickPick } from './SessionQuickPick'
import { TasteRadar } from './TasteRadar'

type TasteProfileSummaryProps = {
  greeting: string
  baseline: BaselineTaste
}

export function TasteProfileSummary({ greeting, baseline }: TasteProfileSummaryProps) {
  const { t, i18n } = useTranslation()
  const flavors = topFlavorFamilies(t, baseline)
  const title = flavorTitle(t, baseline)
  const heroSvg = resolveProfileHeroSvg(baseline, baseline.icons)
  const persona = personaForLang(baseline, i18n.language)
  const radarAxes = [
    { key: 'bitterness', value: baseline.bitterness },
    { key: 'sweetness', value: baseline.sweetness ?? 0.5 },
    { key: 'body', value: baseline.body ?? 0.5 },
    { key: 'hoppy', value: baseline.flavor_family.hoppy ?? 0 },
    { key: 'malty', value: baseline.flavor_family.malty ?? 0 },
    { key: 'roasty', value: baseline.flavor_family.roasty ?? 0 },
    { key: 'sour', value: baseline.flavor_family.sour ?? 0 },
    { key: 'novelty', value: baseline.novelty_affinity },
  ]
  const radarLabels: Record<string, string> = {
    bitterness: t('profile.dials.bitterness.label'),
    sweetness: t('profile.dials.sweetness.label'),
    body: t('profile.dials.body.label'),
    hoppy: t('flavors.hoppy'),
    malty: t('flavors.malty'),
    roasty: t('flavors.roasty'),
    sour: t('flavors.sour'),
    novelty: t('profile.dials.novelty.label'),
  }
  const updated = new Date(baseline.updated_at).toLocaleDateString(
    i18n.language.startsWith('he') ? 'he-IL' : 'en-US',
    { month: 'short', day: 'numeric', year: 'numeric' },
  )

  return (
    <div className="flex flex-col gap-8 animate-[fadeIn_320ms_ease-out]">
      <section className="space-y-1">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-300">
          {greeting}
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
          {t('profile.summary.ready')}
        </h1>
      </section>

      <Card className="overflow-hidden border border-brand-700/50 bg-[hsl(25_24%_7%)] p-0 shadow-md">
        <div className="flex items-start gap-4 p-6 pb-4">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-neutral-100 shadow-sm ring-1 ring-brand-700/40"
            aria-hidden
          >
            {heroSvg ? <GeneratedTasteIcon svg={heroSvg} className="h-9 w-9" /> : null}
          </span>
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-300">
              {t('profile.title')}
            </p>
            {title ? (
              <h2 className="text-2xl font-bold tracking-tight text-neutral-900">{title}</h2>
            ) : null}
            <p className="text-base text-neutral-600">{noveltyLabel(t, baseline)}</p>
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

        <div className="border-t border-brand-700/30 bg-neutral-100/40 px-6 py-3">
          <p className="text-xs text-neutral-500">
            {t('profile.summary.lastUpdated', { date: updated })}
          </p>
        </div>
      </Card>

      <Card className="space-y-4 p-6">
        {persona ? (
          <div className="space-y-1 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {t('profile.persona.heading')}
            </p>
            <h2 data-testid="persona-title" className="text-xl font-bold text-neutral-900">
              {persona.title}
            </h2>
            <p className="text-sm text-neutral-600">{persona.blurb}</p>
          </div>
        ) : null}
        <TasteRadar axes={radarAxes} labels={radarLabels} ariaLabel={t('profile.radar.aria')} />
      </Card>

      <Card className="border border-brand-700/40 p-6 shadow-sm">
        <SessionQuickPick baseline={baseline} />
      </Card>

      <Card className="space-y-5 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          {t('profile.summary.dials')}
        </h2>

        <div className="space-y-4">
          <TasteDial
            label={t('profile.dials.carbonation.label')}
            value={baseline.bubbles}
            low={t('profile.dials.carbonation.low')}
            mid={t('profile.dials.carbonation.mid')}
            high={t('profile.dials.carbonation.high')}
          />
          <TasteDial
            label={t('profile.dials.bitterness.label')}
            value={baseline.bitterness}
            low={t('profile.dials.bitterness.low')}
            mid={t('profile.dials.bitterness.mid')}
            high={t('profile.dials.bitterness.high')}
          />
          <TasteDial
            label={t('profile.dials.sweetness.label')}
            value={baseline.sweetness ?? 0.5}
            low={t('profile.dials.sweetness.low')}
            mid={t('profile.dials.sweetness.mid')}
            high={t('profile.dials.sweetness.high')}
          />
          <TasteDial
            label={t('profile.dials.body.label')}
            value={baseline.body ?? 0.5}
            low={t('profile.dials.body.low')}
            mid={t('profile.dials.body.mid')}
            high={t('profile.dials.body.high')}
          />
          <TasteDial
            label={t('profile.dials.novelty.label')}
            value={baseline.novelty_affinity}
            low={t('profile.dials.novelty.low')}
            mid={t('profile.dials.novelty.mid')}
            high={t('profile.dials.novelty.high')}
          />
        </div>
      </Card>

      <section className="flex flex-col gap-3">
        <Link to="/onboarding">
          <Button className="w-full" size="md" variant="outline">
            {t('profile.summary.retake')}
          </Button>
        </Link>
        <p className="text-center text-xs text-neutral-500">
          {t('profile.summary.retakeHint')}
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
      <div className="h-2.5 overflow-hidden rounded-full bg-neutral-200">
        <div
          className="h-full rounded-full bg-gradient-to-r rtl:bg-gradient-to-l from-brand-500 to-brand-300 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
