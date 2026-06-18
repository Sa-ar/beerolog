import { Card, CardContent } from '@beerolog/ui'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '../components/LanguageSwitcher'

export const Route = createFileRoute('/account/settings')({
  component: AccountSettings,
})

function AccountSettings() {
  const { t } = useTranslation()
  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="mb-2 text-sm font-semibold text-neutral-700">{t('settings.language')}</h2>
        <LanguageSwitcher />
      </CardContent>
    </Card>
  )
}
