import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { AuthControls } from './AuthControls'
import { BeerologLogo } from './BeerologLogo'

export function AppHeader() {
  const { t } = useTranslation()
  return (
    <header className="sticky top-0 z-10 border-b border-amber-100 bg-white/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center rounded-md transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          aria-label={t('header.home')}
        >
          <BeerologLogo />
        </Link>
        <nav className="flex items-center gap-4">
          <AuthControls />
        </nav>
      </div>
    </header>
  )
}
