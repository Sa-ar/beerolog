import { Show } from '@clerk/tanstack-react-start'
import { CatalogIcon } from '@beerolog/icons'
import { Link, useRouterState } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { SIGNED_IN_NAV, activeSignedInNavId } from '../lib/signed-in-nav'

/** Mobile-only primary nav. Desktop uses AppSidebar. */
export function AppBottomNav() {
  return (
    <Show when="signed-in">
      <SignedInBottomNav />
    </Show>
  )
}

function SignedInBottomNav() {
  const { t } = useTranslation()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const activeId = activeSignedInNavId(pathname)

  return (
    <nav
      aria-label={t('nav.primary')}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-brand-700/50 bg-[hsl(26_24%_8%)]/95 backdrop-blur md:hidden"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      <ul className="mx-auto flex max-w-3xl items-stretch justify-around px-1 pt-1">
        {SIGNED_IN_NAV.map((item) => {
          const active = item.id === activeId
          return (
            <li key={item.id} className="flex-1">
              <Link
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[0.7rem] font-semibold leading-tight ${
                  active
                    ? 'text-brand-300'
                    : 'text-brand-200/75 hover:bg-white/5 hover:text-brand-200'
                }`}
              >
                <CatalogIcon
                  group={item.iconGroup}
                  iconKey={item.iconKey}
                  className={`h-6 w-6 shrink-0 ${active ? 'opacity-100' : 'opacity-70'}`}
                />
                {t(item.labelKey)}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
