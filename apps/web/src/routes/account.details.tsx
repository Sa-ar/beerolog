import { useUser } from '@clerk/tanstack-react-start'
import { Button, Card, CardContent, Input } from '@beerolog/ui'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { clerkErrorMessage } from '../lib/clerkError'

// Account > Details: name, username, and avatar. Renamed from the old
// /account/profile (that slug now hosts the taste Profile tab).
export const Route = createFileRoute('/account/details')({
  component: DetailsPage,
})

function DetailsPage() {
  const { t } = useTranslation()
  const { isLoaded, user } = useUser()
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({ firstName: '', lastName: '', username: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setForm({
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      username: user.username ?? '',
    })
  }, [user?.id])

  if (!isLoaded || !user) return null

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const payload: { firstName: string; lastName: string; username?: string } = {
        firstName: form.firstName,
        lastName: form.lastName,
      }
      if (form.username !== (user.username ?? '')) payload.username = form.username
      await user.update(payload)
      setSaved(true)
    } catch (err) {
      setError(clerkErrorMessage(err, t('account.details.error')))
    } finally {
      setSaving(false)
    }
  }

  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setError(null)
    try {
      await user.setProfileImage({ file })
    } catch (err) {
      setError(clerkErrorMessage(err, t('account.details.error')))
    }
  }

  async function removeAvatar() {
    if (!user) return
    setError(null)
    try {
      await user.setProfileImage({ file: null })
    } catch (err) {
      setError(clerkErrorMessage(err, t('account.details.error')))
    }
  }

  const initials = (user.firstName?.[0] ?? user.fullName?.[0] ?? '?').toUpperCase()

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-amber-700 text-xl font-semibold text-[#fff]">
            {user.hasImage ? (
              <img src={user.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onAvatarChange}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              {t('account.details.upload')}
            </Button>
            {user.hasImage && (
              <Button type="button" variant="ghost" size="sm" onClick={removeAvatar}>
                {t('account.details.remove')}
              </Button>
            )}
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
            {t('account.details.firstName')}
            <Input
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
            {t('account.details.lastName')}
            <Input
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
            {t('account.details.username')}
            <Input
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {saved && <p className="text-sm text-green-700">{t('account.details.saved')}</p>}

          <div>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? t('account.details.saving') : t('account.details.save')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
