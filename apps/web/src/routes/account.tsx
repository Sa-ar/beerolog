import { RedirectToSignIn, Show } from '@clerk/tanstack-react-start'
import { Link, Outlet, createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/account')({
  component: AccountLayout,
})

const TABS = [
  { to: '/account/profile', key: 'profile' },
  { to: '/account/security', key: 'security' },
  { to: '/account/settings', key: 'settings' },
] as const

function AccountLayout() {
  const { t } = useTranslation()
  return (
    <>
      <Show when="signed-out">
        <RedirectToSignIn />
      </Show>
      <Show when="signed-in">
        <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
          <h1 className="text-2xl font-bold text-neutral-900">{t('account.title')}</h1>
          <div className="mt-6 flex flex-col gap-6 sm:flex-row">
            <nav className="flex gap-1 sm:w-48 sm:flex-col" aria-label={t('account.title')}>
              {TABS.map((tab) => (
                <Link
                  key={tab.key}
                  to={tab.to}
                  className="rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                  activeProps={{ className: 'bg-amber-700 text-white' }}
                  inactiveProps={{ className: 'text-neutral-600 hover:bg-amber-50' }}
                >
                  {t(`account.tabs.${tab.key}`)}
                </Link>
              ))}
            </nav>
            <div className="flex-1">
              <Outlet />
            </div>
          </div>
        </main>
      </Show>
    </>
  )
}
