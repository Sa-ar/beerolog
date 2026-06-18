import { useTranslation } from 'react-i18next'
import { LANGS, type Lang, dirFor, normalizeLang, setLangCookie } from '../i18n/locale-cookie'

// HE/EN toggle. Switches language live (no reload), updates <html lang/dir>, and
// persists the choice in a cookie so the next SSR render matches.
export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { i18n, t } = useTranslation()
  const current = normalizeLang(i18n.language)

  function switchTo(lang: Lang) {
    if (lang === current) return
    setLangCookie(lang)
    void i18n.changeLanguage(lang)
    document.documentElement.lang = lang
    document.documentElement.dir = dirFor(lang)
  }

  return (
    <div
      dir="ltr"
      role="group"
      aria-label={t('language.label')}
      className={`inline-flex shrink-0 overflow-hidden rounded-lg border border-amber-200 text-sm ${className}`}
    >
      {LANGS.map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => switchTo(lang)}
          aria-pressed={current === lang}
          className={`min-w-[4.75rem] px-3 py-1.5 text-center font-medium transition-colors ${
            current === lang
              ? 'bg-amber-700 text-white'
              : 'bg-white text-amber-800 hover:bg-amber-50'
          }`}
        >
          {t(`language.${lang}`)}
        </button>
      ))}
    </div>
  )
}
