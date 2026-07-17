import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { CatalogIcon, GeneratedTasteIcon, resolveProfileHeroSvg } from '@beerolog/icons'
import { Badge, Button, Card, Heading } from '@beerolog/ui'
import {
  flavorTitle,
  noveltyLabel,
  personaForLang,
  topFlavorFamilies,
  type BaselineTaste,
} from '../lib/baseline-taste'
import { useRatingCount } from '../lib/rating-count'
import { SessionQuickPick } from './SessionQuickPick'
import { TasteRadar } from './TasteRadar'

type TasteProfileSummaryProps = {
  greeting: string
  baseline: BaselineTaste
}

export function TasteProfileSummary({ greeting, baseline }: TasteProfileSummaryProps) {
  const { t, i18n } = useTranslation()
  const { data: ratingCount } = useRatingCount()

  const flavors = topFlavorFamilies(t, baseline)
  const title = flavorTitle(t, baseline)
  const heroSvg = resolveProfileHeroSvg(baseline, baseline.icons)
  const persona = personaForLang(baseline, i18n.language)
  // One canonical identity: prefer the generated persona name, fall back to the
  // deterministic flavor title. #226
  const displayName = persona?.title ?? title
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
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-300">{greeting}</p>
        <Heading className="text-3xl sm:text-4xl">{t('profile.summary.ready')}</Heading>
      </section>

      <Link to="/menu" className="block">
        <Card className="flex items-center gap-4 border border-brand-500 bg-brand-50 p-6 shadow-sm transition-colors hover:bg-brand-100">
          <span className="text-3xl" aria-hidden>
            📷
          </span>
          <div className="min-w-0 flex-1">
            <Heading level={2} className="text-xl">
              {t('menu.dashboardCta')}
            </Heading>
            <p className="mt-1 text-sm text-neutral-600">{t('menu.dashboardHint')}</p>
          </div>
          <span aria-hidden className="shrink-0 text-xl text-brand-600">
            →
          </span>
        </Card>
      </Link>

      <Card className="border border-brand-700/40 p-6 shadow-sm" data-testid="session-hero">
        <SessionQuickPick baseline={baseline} />
      </Card>

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
            {displayName ? (
              <Heading level={2} data-testid="persona-title" className="text-2xl">
                {displayName}
              </Heading>
            ) : null}
            <p className="text-base text-neutral-600">
              {persona?.blurb ?? noveltyLabel(t, baseline)}
            </p>
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

      <section className="flex flex-col gap-6" data-testid="taste-details">
        <Card className="space-y-4 p-6">
          <TasteRadar axes={radarAxes} labels={radarLabels} ariaLabel={t('profile.radar.aria')} />
        </Card>
        <div className="flex flex-col gap-3">
          {ratingCount != null ? (
            <p className="text-center text-sm text-neutral-600">
              {t('profile.summary.ratingProgress', { count: ratingCount })}
            </p>
          ) : null}
          <Link to="/onboarding">
            <Button className="w-full" size="md" variant="outline">
              {t('profile.summary.retake')}
            </Button>
          </Link>
          <p className="text-center text-xs text-neutral-500">{t('profile.summary.retakeHint')}</p>
        </div>
      </section>
    </div>
  )
}
