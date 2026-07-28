import { RedirectToSignIn, Show } from '@clerk/tanstack-react-start'
import { Link, Outlet, createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Heading } from '@beerolog/ui'
import { PAGE_SHELL_X } from '../lib/page-shell'

export const Route = createFileRoute('/account')({
  component: AccountLayout,
})

const TABS = [
  { to: '/account/profile', key: 'profile' },
  { to: '/account/collection', key: 'collection' },
  { to: '/account/details', key: 'details' },
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
        <main className={`${PAGE_SHELL_X} py-8`}>
          <Heading className="text-2xl">{t('account.title')}</Heading>
          <div className="mt-6 flex flex-col gap-6 sm:flex-row">
            <nav className="flex gap-1 sm:w-48 sm:flex-col" aria-label={t('account.title')}>
              {TABS.map((tab) => (
                <Link
                  key={tab.key}
                  to={tab.to}
                  className="rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                  activeProps={{ className: 'bg-amber-700 text-[#fff]' }}
                  inactiveProps={{ className: 'text-neutral-600 hover:bg-white/5' }}
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
