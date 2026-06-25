import { Card, CardContent } from '@beerolog/ui'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { DeleteAccountCard } from '../components/DeleteAccountCard'
import { ExportDataCard } from '../components/ExportDataCard'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { LEGAL_SLUGS } from '../lib/legal/registry'

export const Route = createFileRoute('/account/settings')({
  component: AccountSettings,
})

function AccountSettings() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="pt-6">
          <h2 className="mb-2 text-sm font-semibold text-neutral-700">{t('settings.language')}</h2>
          <LanguageSwitcher />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <h2 className="mb-4 text-sm font-semibold text-neutral-700">{t('footer.legal')}</h2>
          <div className="flex flex-col gap-3">
            {LEGAL_SLUGS.map((slug) => (
              <Link
                key={slug}
                to="/legal/$slug"
                params={{ slug }}
                className="text-sm font-medium text-neutral-600 hover:text-brand-300 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                {t(`footer.${slug}`)}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
      <ExportDataCard />
      <DeleteAccountCard />
    </div>
  )
}
