import { Card, CardContent } from '@beerolog/ui'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { apiClient } from '../lib/api-client/client'

// Right-to-portability UI. Fetches GET /me/export and offers the JSON for
// download / inspection.
export function ExportDataCard() {
  const { t } = useTranslation()
  const [json, setJson] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  async function handleExport() {
    setError(false)
    setLoading(true)
    const { data, error: apiError } = await apiClient.GET('/me/export')
    setLoading(false)
    if (apiError || !data) {
      setError(true)
      return
    }
    setJson(JSON.stringify(data, null, 2))
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="mb-2 text-sm font-semibold text-neutral-700">{t('privacy.export.title')}</h2>
        <p className="mb-4 text-sm text-neutral-600">{t('privacy.export.description')}</p>
        <button
          type="button"
          onClick={handleExport}
          disabled={loading}
          className="rounded-lg border border-amber-200 px-3 py-2 text-sm font-medium text-brand-300 hover:bg-white/5 disabled:opacity-50"
        >
          {loading ? t('privacy.export.loading') : t('privacy.export.cta')}
        </button>
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {t('privacy.export.error')}
          </p>
        )}
        {json && (
          <div className="mt-4 space-y-2">
            <a
              download="beerolog-data.json"
              href={`data:application/json;charset=utf-8,${encodeURIComponent(json)}`}
              className="inline-block text-sm font-medium text-brand-300 underline"
            >
              {t('privacy.export.download')}
            </a>
            <pre className="max-h-72 overflow-auto rounded-lg bg-neutral-50 p-3 text-xs text-neutral-700">
              {json}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
