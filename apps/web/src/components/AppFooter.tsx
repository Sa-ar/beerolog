import { useTranslation } from 'react-i18next'
import { PAGE_FOOTER_SHELL } from '../lib/page-shell'
import { LanguageSwitcher } from './LanguageSwitcher'

export function AppFooter() {
  const { t } = useTranslation()

  return (
    <footer className="mt-auto border-t border-amber-100 bg-white/80">
      <div
        className={`${PAGE_FOOTER_SHELL} flex flex-col items-center gap-4 py-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-start`}
      >
        <p dir="auto" className="text-xs text-neutral-500 sm:max-w-md">
          {t('footer.responsibleDrinking')}
        </p>
        <LanguageSwitcher className="mx-auto shrink-0 sm:mx-0" />
      </div>
    </footer>
  )
}
