import { useTranslation } from 'react-i18next'
import { Button, Heading } from '@beerolog/ui'
import type { BaselineLoadErrorReason } from '../lib/user-facing-errors'
import { describeBaselineLoadError } from '../lib/user-facing-errors'
import { StatusCard } from './StatusCard'

type TasteProfileErrorStateProps = {
  greeting: string
  reason: BaselineLoadErrorReason
  onRetry: () => void
}

export function TasteProfileErrorState({
  greeting,
  reason,
  onRetry,
}: TasteProfileErrorStateProps) {
  const { t } = useTranslation()
  const { title, message } = describeBaselineLoadError(t, reason)

  return (
    <div className="flex flex-col gap-8">
      <section className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
          {greeting}
        </p>
        <Heading className="text-3xl sm:text-4xl">{t('profile.title')}</Heading>
      </section>

      <StatusCard
        variant="error"
        title={title}
        description={message}
        action={
          <Button className="w-full max-w-xs" size="lg" onClick={onRetry}>
            {t('common.tryAgain')}
          </Button>
        }
      />
    </div>
  )
}
