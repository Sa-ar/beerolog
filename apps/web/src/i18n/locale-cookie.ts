import { createIsomorphicFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'

export type Lang = 'he' | 'en'
export const LANGS: Lang[] = ['he', 'en']
export const DEFAULT_LANG: Lang = 'he'
export const LANG_COOKIE = 'lang'

export function normalizeLang(value: string | undefined | null): Lang {
  // ponytail: only two languages; anything that isn't 'en' falls back to the HE default.
  return value === 'en' ? 'en' : 'he'
}

export function dirFor(lang: Lang): 'rtl' | 'ltr' {
  return lang === 'he' ? 'rtl' : 'ltr'
}

function readClientCookie(name: string): string | undefined {
  const value = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))?.[1]
  return value == null ? undefined : decodeURIComponent(value)
}

// Resolves the active language: from the request cookie on the server, from
// document.cookie on the client. SSR-correct so the first paint has the right dir.
export const getLang = createIsomorphicFn()
  .server(() => normalizeLang(getCookie(LANG_COOKIE)))
  .client(() => normalizeLang(readClientCookie(LANG_COOKIE)))

// Client-only: persist the choice for ~1 year.
export function setLangCookie(lang: Lang) {
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`
}
