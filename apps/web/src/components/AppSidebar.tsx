import { Show } from '@clerk/tanstack-react-start'
import { BackIcon, CatalogIcon } from '@beerolog/icons'
import { Link, useRouterState } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ACCOUNT_NAV, isAccountPath } from '../lib/account-nav'
import { SIGNED_IN_NAV, activeSignedInNavId } from '../lib/signed-in-nav'
import { BeerologLogo } from './BeerologLogo'
import { UserMenu } from './UserMenu'

/** Desktop sidebar: logo, primary nav (or account nav), user at bottom. Mobile uses AppHeader + AppBottomNav. */
export function AppSidebar() {
  return (
    <Show when="signed-in">
      <SignedInSidebar />
    </Show>
  )
}

function SignedInSidebar() {
  const { t } = useTranslation()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const inAccount = isAccountPath(pathname)

  return (
    <aside className="sticky top-0 z-[9] hidden h-dvh w-52 shrink-0 flex-col border-e border-brand-700/40 bg-[hsl(26_24%_8%)]/90 md:flex">
      <div className="shrink-0 border-b border-brand-700/40 px-3 py-4">
        <Link
          to="/"
          className="inline-flex min-w-0 items-center rounded-md transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          aria-label={t('header.home')}
        >
          <BeerologLogo />
        </Link>
      </div>
      {inAccount ? <AccountSidebarNav pathname={pathname} /> : <DecksSidebarNav pathname={pathname} />}
      <div className="shrink-0 border-t border-brand-700/40 p-3">
        <UserMenu menuPlacement="up" />
      </div>
    </aside>
  )
}

function DecksSidebarNav({ pathname }: { pathname: string }) {
  const { t } = useTranslation()
  const activeId = activeSignedInNavId(pathname)

  return (
    <nav aria-label={t('nav.primary')} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
      <p className="px-1 font-script text-sm text-brand-200/60">{t('nav.decksEyebrow')}</p>
      {SIGNED_IN_NAV.map((item) => {
        const active = item.id === activeId
        return (
          <Link
            key={item.id}
            to={item.to}
            aria-current={active ? 'page' : undefined}
            className={`inline-flex min-h-11 items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${
              active
                ? 'bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/50'
                : 'text-brand-200/90 hover:bg-white/5 hover:text-brand-200'
            }`}
          >
            <CatalogIcon
              group={item.iconGroup}
              iconKey={item.iconKey}
              className="mt-0.5 h-5 w-5 shrink-0 opacity-90"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold leading-tight">{t(item.labelKey)}</span>
              <span
                className={`mt-0.5 block text-xs font-normal leading-snug ${
                  active ? 'text-brand-200/75' : 'text-brand-200/55'
                }`}
              >
                {t(item.hintKey)}
              </span>
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

function AccountSidebarNav({ pathname }: { pathname: string }) {
  const { t } = useTranslation()

  return (
    <nav aria-label={t('nav.account')} className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3">
      <Link
        to="/"
        className="mb-2 inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-brand-200/90 transition-colors hover:bg-white/5 hover:text-brand-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
      >
        <BackIcon className="h-4 w-4 shrink-0 rtl:rotate-180" />
        {t('nav.backToApp')}
      </Link>
      <p className="px-1 font-script text-sm text-brand-200/60">{t('nav.accountEyebrow')}</p>
      {ACCOUNT_NAV.map((item) => {
        const active = pathname === item.to || pathname.startsWith(`${item.to}/`)
        return (
          <Link
            key={item.key}
            to={item.to}
            aria-current={active ? 'page' : undefined}
            className={`inline-flex min-h-11 items-center rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
              active
                ? 'bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/50'
                : 'text-brand-200/90 hover:bg-white/5 hover:text-brand-200'
            }`}
          >
            {t(`account.tabs.${item.key}`)}
          </Link>
        )
      })}
    </nav>
  )
}
