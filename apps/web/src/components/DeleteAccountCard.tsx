import { Card, CardContent } from '@beerolog/ui'
import { useClerk } from '@clerk/tanstack-react-start'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { apiClient } from '../lib/api-client/client'

// Right-to-erasure UI. Requires the user to type the exact confirm phrase, then
// calls DELETE /me and completes Clerk sign-out on success.
export function DeleteAccountCard() {
  const { t } = useTranslation()
  const { signOut } = useClerk()
  const [confirming, setConfirming] = useState(false)
  const [phrase, setPhrase] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(false)

  const expected = t('privacy.delete.confirmPhrase')
  const canDelete = phrase.trim().toLowerCase() === expected.toLowerCase() && !deleting

  async function handleDelete() {
    setError(false)
    setDeleting(true)
    const { data, error: apiError } = await apiClient.DELETE('/me')
    if (apiError || !data?.deleted) {
      setDeleting(false)
      setError(true)
      return
    }
    await signOut()
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="mb-2 text-sm font-semibold text-neutral-700">{t('privacy.delete.title')}</h2>
        <p className="mb-4 text-sm text-neutral-600">{t('privacy.delete.description')}</p>
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            {t('privacy.delete.cta')}
          </button>
        ) : (
          <div className="space-y-3">
            <label htmlFor="delete-confirm" className="block text-sm text-neutral-700">
              {t('privacy.delete.inputLabel')}
            </label>
            <input
              id="delete-confirm"
              type="text"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              disabled={deleting}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {t('privacy.delete.error')}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={!canDelete}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {deleting ? t('privacy.delete.deleting') : t('privacy.delete.confirm')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirming(false)
                  setPhrase('')
                  setError(false)
                }}
                disabled={deleting}
                className="rounded-lg px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
              >
                {t('privacy.delete.cancel')}
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
