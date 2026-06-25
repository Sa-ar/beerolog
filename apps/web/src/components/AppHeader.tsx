import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { PAGE_HEADER_SHELL } from '../lib/page-shell'
import { AuthControls } from './AuthControls'
import { BeerologLogo } from './BeerologLogo'

export function AppHeader() {
  const { t } = useTranslation()
  return (
    <header className="sticky top-0 z-10 border-b border-brand-700/50 bg-[hsl(26_24%_8%)]/85 backdrop-blur">
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
          <AuthControls />
        </nav>
      </div>
    </header>
  )
}
