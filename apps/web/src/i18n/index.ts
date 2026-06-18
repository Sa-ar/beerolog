import i18next, { type i18n } from 'i18next'
import { initReactI18next } from 'react-i18next'
import type { Lang } from './locale-cookie'
import en from './locales/en/common.json'
import he from './locales/he/common.json'

// Fresh instance per call — never a shared singleton on the server (one request
// must not leak its language into another). init is synchronous with inline resources.
export function createI18n(lang: Lang): i18n {
  const instance = i18next.createInstance()
  void instance.use(initReactI18next).init({
    lng: lang,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common'],
    resources: {
      en: { common: en },
      he: { common: he },
    },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  })
  return instance
}
