import { Card, CardContent, Heading } from '@beerolog/ui'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DeleteAccountCard } from '../components/DeleteAccountCard'
import { ExportDataCard } from '../components/ExportDataCard'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { LEGAL_SLUGS } from '../lib/legal/registry'
import {
  getWantArrowKeysPref,
  setWantArrowKeysPref,
} from '../lib/want-arrow-keys'

export const Route = createFileRoute('/account/settings')({
  component: AccountSettings,
})

function AccountSettings() {
  const { t } = useTranslation()
  const [arrowKeysOn, setArrowKeysOn] = useState(false)

  useEffect(() => {
    setArrowKeysOn(getWantArrowKeysPref() === 'on')
  }, [])

  function onArrowKeysChange(checked: boolean) {
    setWantArrowKeysPref(checked ? 'on' : 'off')
    setArrowKeysOn(checked)
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="pt-6">
          <Heading level={2} className="mb-2 text-sm font-semibold text-neutral-700">
            {t('settings.language')}
          </Heading>
          <LanguageSwitcher />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <Heading level={2} className="mb-4 text-sm font-semibold text-neutral-700">
            {t('settings.controls')}
          </Heading>
          <label className="flex cursor-pointer items-start justify-between gap-4">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-neutral-900">
                {t('settings.arrowKeys')}
              </span>
              <span className="mt-1 block text-sm text-neutral-500">
                {t('settings.arrowKeysHint')}
              </span>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={arrowKeysOn}
              onChange={(e) => onArrowKeysChange(e.target.checked)}
              aria-label={t('settings.arrowKeys')}
              className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-brand-500"
            />
          </label>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <Heading level={2} className="mb-4 text-sm font-semibold text-neutral-700">
            {t('footer.legal')}
          </Heading>
          <div className="flex flex-col gap-3">
            {LEGAL_SLUGS.map((slug) => (
              <Link
                key={slug}
                to="/legal/$slug"
                params={{ slug }}
                className="text-sm font-medium text-neutral-600 transition-colors hover:text-brand-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
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
