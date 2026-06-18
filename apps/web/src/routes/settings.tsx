import { RedirectToSignIn, Show } from '@clerk/tanstack-react-start'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const { t } = useTranslation()

  return (
    <>
      <Show when="signed-out">
        <RedirectToSignIn />
      </Show>
      <Show when="signed-in">
        <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
          <h1 className="text-2xl font-bold text-neutral-900">{t('settings.title')}</h1>
        </main>
      </Show>
    </>
  )
}
