/**
 * Preference for arrow-key choices on the `What I want` deck.
 * - `on`: arrows commit (after first-run confirm or Settings toggle)
 * - `off`: arrows ignored (Settings disable)
 * - `unset`: first arrow shows the teach dialog
 */
export const WANT_ARROW_KEYS_STORAGE_KEY = 'beerolog_want_arrow_keys'

export type WantArrowKeysPref = 'on' | 'off' | 'unset'

export function getWantArrowKeysPref(): WantArrowKeysPref {
  try {
    const raw = localStorage.getItem(WANT_ARROW_KEYS_STORAGE_KEY)
    if (raw === '1' || raw === 'on') return 'on'
    if (raw === '0' || raw === 'off') return 'off'
    return 'unset'
  } catch {
    return 'unset'
  }
}

export function setWantArrowKeysPref(pref: 'on' | 'off'): void {
  try {
    localStorage.setItem(WANT_ARROW_KEYS_STORAGE_KEY, pref === 'on' ? '1' : '0')
  } catch {
    // private mode / blocked storage
  }
}

export function isWantArrowKeysEnabled(): boolean {
  return getWantArrowKeysPref() === 'on'
}
