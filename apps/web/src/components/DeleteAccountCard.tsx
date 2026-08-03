import { Card, CardContent, Heading } from '@beerolog/ui'
import { useClerk } from '@clerk/tanstack-react-start'
import { useMutation } from '@tanstack/react-query'
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
  // Once DELETE /me succeeds the account is gone — never send it again. If
  // sign-out then fails, the only action left is retrying sign-out.
  const [accountDeleted, setAccountDeleted] = useState(false)

  const expected = t('privacy.delete.confirmPhrase')

  // Server state via react-query so a thrown signOut() (or a failed DELETE) resets
  // the busy state and surfaces an error, instead of hanging on "deleting" forever.
  const del = useMutation({
    mutationFn: async () => {
      if (!accountDeleted) {
        const { data, error: apiError } = await apiClient.DELETE('/me')
        if (apiError || !data?.deleted) throw new Error('delete-account-failed')
        setAccountDeleted(true)
      }
      await signOut()
    },
  })
  const deleting = del.isPending
  const error = del.isError
  const phraseOk = phrase.trim().toLowerCase() === expected.toLowerCase()
  // After deletion the phrase gate is moot — the only remaining action is retry.
  const canSubmit = !deleting && (accountDeleted || phraseOk)

  function handleDelete() {
    if (!canSubmit) return
    del.mutate()
  }

  let submitLabel = t('privacy.delete.confirm')
  if (deleting) submitLabel = t('privacy.delete.deleting')
  else if (accountDeleted) submitLabel = t('privacy.delete.retrySignOut')

  return (
    <Card>
      <CardContent className="pt-6">
        <Heading level={2} className="mb-2 text-sm font-semibold text-neutral-700">{t('privacy.delete.title')}</Heading>
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
                {accountDeleted ? t('privacy.delete.signOutError') : t('privacy.delete.error')}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={!canSubmit}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-[#fff] disabled:opacity-50"
              >
                {submitLabel}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirming(false)
                  setPhrase('')
                  del.reset()
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
