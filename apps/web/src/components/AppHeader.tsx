import { Show } from '@clerk/tanstack-react-start'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { PAGE_HEADER_SHELL } from '../lib/page-shell'
import { AuthControls } from './AuthControls'
import { BeerologLogo } from './BeerologLogo'

export function AppHeader() {
  const { t } = useTranslation()
  return (
    <header className="sticky top-0 z-10 border-b border-amber-100 bg-white/80 backdrop-blur">
      <div className={`${PAGE_HEADER_SHELL} flex min-w-0 items-center justify-between py-3`}>
        <Link
          to="/"
          className="inline-flex min-w-0 items-center rounded-md transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          aria-label={t('header.home')}
        >
          <span className="sm:hidden">
            <BeerologLogo iconOnly />
          </span>
          <span className="hidden sm:inline-flex">
            <BeerologLogo />
          </span>
        </Link>
        <nav className="flex shrink-0 items-center gap-4">
          <Show when="signed-in">
            <Link
              to="/settings"
              aria-label={t('settings.title')}
              className="inline-flex items-center rounded-md p-1.5 text-amber-800 transition-colors hover:bg-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </Link>
          </Show>
          <AuthControls />
        </nav>
      </div>
    </header>
  )
}
