import { Show } from '@clerk/tanstack-react-start'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { PAGE_HEADER_SHELL } from '../lib/page-shell'
import { AuthControls } from './AuthControls'
import { BeerologLogo } from './BeerologLogo'

/**
 * Top chrome: always for signed-out; signed-in only on mobile.
 * Desktop signed-in brand + user live in AppSidebar.
 */
export function AppHeader() {
  return (
    <>
      <Show when="signed-out">
        <HeaderBar showWordmarkOnDesktop />
      </Show>
      <Show when="signed-in">
        <HeaderBar className="md:hidden" />
      </Show>
    </>
  )
}

function HeaderBar({
  className = '',
  showWordmarkOnDesktop = false,
}: {
  className?: string
  showWordmarkOnDesktop?: boolean
}) {
  const { t } = useTranslation()
  return (
    <header
      className={`sticky top-0 z-10 border-b border-brand-700/50 bg-[hsl(26_24%_8%)]/85 backdrop-blur ${className}`}
    >
      <div
        className={`${PAGE_HEADER_SHELL} flex min-h-[4.25rem] min-w-0 items-center justify-between py-3`}
      >
        <Link
          to="/"
          className="inline-flex min-w-0 items-center rounded-md transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          aria-label={t('header.home')}
        >
          {showWordmarkOnDesktop ? (
            <>
              <span className="md:hidden">
                <BeerologLogo iconOnly />
              </span>
              <span className="hidden md:inline-flex">
                <BeerologLogo />
              </span>
            </>
          ) : (
            <BeerologLogo iconOnly />
          )}
        </Link>
        <AuthControls />
      </div>
    </header>
  )
}
