import { useReverification, useSession, useUser } from '@clerk/tanstack-react-start'
import { Button, Card, CardContent, Heading, Input } from '@beerolog/ui'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { clerkErrorMessage } from '../lib/clerkError'

export const Route = createFileRoute('/account/security')({
  component: SecurityPage,
})

// Loosely typed view of Clerk's SessionWithActivities (avoids importing an
// internal type path that shifts between versions).
type ActiveSession = {
  id: string
  revoke: () => Promise<unknown>
  latestActivity?: {
    deviceType?: string | null
    browserName?: string | null
    city?: string | null
    country?: string | null
  } | null
}

function SecurityPage() {
  const { t } = useTranslation()
  const { isLoaded, user } = useUser()
  const { session: currentSession } = useSession()
  const [pwd, setPwd] = useState({ current: '', next: '', signOutOthers: false })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updatePassword = useReverification(
    (params: { currentPassword?: string; newPassword: string; signOutOfOtherSessions?: boolean }) =>
      user!.updatePassword(params),
  )
  const revokeSession = useReverification((s: ActiveSession) => s.revoke())

  const sessionsQuery = useQuery({
    queryKey: ['account', 'sessions', user?.id],
    enabled: !!user,
    queryFn: async () => (await user!.getSessions()) as unknown as ActiveSession[],
  })
  const sessions = sessionsQuery.data ?? []

  if (!isLoaded || !user) return null

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const params: {
        currentPassword?: string
        newPassword: string
        signOutOfOtherSessions?: boolean
      } = { newPassword: pwd.next, signOutOfOtherSessions: pwd.signOutOthers }
      if (pwd.current) params.currentPassword = pwd.current
      await updatePassword(params)
      setSaved(true)
      setPwd({ current: '', next: '', signOutOthers: false })
      await sessionsQuery.refetch()
    } catch (err) {
      setError(clerkErrorMessage(err, t('account.security.error')))
    } finally {
      setSaving(false)
    }
  }

  async function onRevoke(s: ActiveSession) {
    setError(null)
    try {
      await revokeSession(s)
      await sessionsQuery.refetch()
    } catch (err) {
      setError(clerkErrorMessage(err, t('account.security.error')))
    }
  }

  function deviceLabel(s: ActiveSession): string {
    const a = s.latestActivity
    return [a?.browserName, a?.deviceType, a?.city ?? a?.country].filter(Boolean).join(' · ') || '—'
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="pt-6">
          <Heading level={2} className="mb-4 text-sm font-semibold text-neutral-700">
            {t('account.security.passwordTitle')}
          </Heading>
          <form onSubmit={onChangePassword} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
              {t('account.security.currentPassword')}
              <Input
                type="password"
                autoComplete="current-password"
                value={pwd.current}
                onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
              {t('account.security.newPassword')}
              <Input
                type="password"
                autoComplete="new-password"
                value={pwd.next}
                onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={pwd.signOutOthers}
                onChange={(e) => setPwd((p) => ({ ...p, signOutOthers: e.target.checked }))}
              />
              {t('account.security.signOutOthers')}
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {saved && <p className="text-sm text-green-700">{t('account.security.saved')}</p>}

            <div>
              <Button type="submit" size="sm" disabled={saving || !pwd.next}>
                {saving ? t('account.security.saving') : t('account.security.changePassword')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Heading level={2} className="mb-4 text-sm font-semibold text-neutral-700">
            {t('account.security.sessionsTitle')}
          </Heading>
          <ul className="flex flex-col divide-y divide-neutral-100">
            {sessions.map((s) => {
              const isCurrent = s.id === currentSession?.id
              return (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-sm text-neutral-700">
                    {deviceLabel(s)}
                    {isCurrent && (
                      <span className="ms-2 text-xs text-neutral-400">
                        ({t('account.security.currentDevice')})
                      </span>
                    )}
                  </span>
                  {!isCurrent && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => onRevoke(s)}>
                      {t('account.security.revoke')}
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
          <p className="mt-4 text-xs text-neutral-400">{t('account.security.note')}</p>
        </CardContent>
      </Card>
    </div>
  )
}
