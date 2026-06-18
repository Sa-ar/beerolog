import { CatalogIcon } from '@beerolog/icons'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button, Card } from '@beerolog/ui'
import { StatusCard } from './StatusCard'

const JOURNEY_STEPS = ['quiz', 'vibe', 'picks'] as const

type TasteProfileEmptyStateProps = {
  greeting: string
}

export function TasteProfileEmptyState({ greeting }: TasteProfileEmptyStateProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-8">
      <section className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
          {greeting}
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
          {t('emptyProfile.headline')}
        </h1>
        <p className="text-lg text-neutral-600">{t('emptyProfile.intro')}</p>
      </section>

      <StatusCard
        variant="empty"
        title={t('emptyProfile.cardTitle')}
        description={t('emptyProfile.cardDescription')}
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
              {t('emptyProfile.cta')}
            </Button>
          </Link>
        }
      />

      <section className="space-y-4">
        <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-neutral-500">
          {t('emptyProfile.whatNext')}
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {JOURNEY_STEPS.map((step, index) => (
            <Card
              key={step}
              className="flex flex-col items-center gap-2 p-4 text-center transition-colors hover:border-brand-300 hover:bg-brand-50/50"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                {index + 1}
              </span>
              <CatalogIcon group="journey" iconKey={step} className="h-9 w-9" />
              <div>
                <p className="font-medium text-neutral-900">
                  {t(`emptyProfile.steps.${step}.title`)}
                </p>
                <p className="mt-1 text-xs text-neutral-600">
                  {t(`emptyProfile.steps.${step}.detail`)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
