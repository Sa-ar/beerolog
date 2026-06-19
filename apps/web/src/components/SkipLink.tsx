import { useTranslation } from 'react-i18next'

// Visually hidden until focused; first focusable element on the page so keyboard
// users can jump past the header straight to #main-content.
export function SkipLink() {
  const { t } = useTranslation()
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:start-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:font-medium focus:text-amber-900 focus:shadow focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-brand-500"
    >
      {t('a11y.skipToContent')}
    </a>
  )
}
