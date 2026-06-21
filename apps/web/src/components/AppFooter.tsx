import { useAuth } from '@clerk/tanstack-react-start'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { LEGAL_SLUGS } from '../lib/legal/registry'
import { PAGE_FOOTER_SHELL } from '../lib/page-shell'
import { LanguageSwitcher } from './LanguageSwitcher'

// Footer present on every page: responsible-drinking note, legal links, and the
// language switcher. Physical (flex) layout keeps order stable across RTL/LTR.
export function AppFooter() {
  const { t } = useTranslation()
  const { isSignedIn } = useAuth()

  // Marketing chrome only — hidden once the user is in the app.
  if (isSignedIn) return null

  return (
    <footer className="mt-auto border-t border-amber-100 bg-white/80">
      <div
        dir="ltr"
        className={`${PAGE_FOOTER_SHELL} flex flex-col items-center gap-4 py-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-start`}
      >
        <p dir="auto" className="text-xs text-neutral-500 sm:max-w-md">
          {t('footer.responsibleDrinking')}
        </p>
        <nav
          aria-label={t('footer.legal')}
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-neutral-600"
        >
          {LEGAL_SLUGS.map((slug) => (
            <Link
              key={slug}
              to="/legal/$slug"
              params={{ slug }}
              className="rounded transition-colors hover:text-amber-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              {t(`footer.${slug}`)}
            </Link>
          ))}
        </nav>
        <LanguageSwitcher className="mx-auto shrink-0 sm:mx-0" />
      </div>
    </footer>
  )
}
