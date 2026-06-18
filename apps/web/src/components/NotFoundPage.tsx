import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@beerolog/ui'
import { StatusCard } from './StatusCard'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-12 sm:px-6 sm:py-16">
      <StatusCard
        variant="notFound"
        title={t('notFound.title')}
        description={t('notFound.description')}
        action={
          <Link to="/" className="w-full max-w-xs">
            <Button className="w-full" size="lg">
              {t('common.backToHome')}
            </Button>
          </Link>
        }
      />
    </main>
  )
}
