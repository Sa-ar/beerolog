import type { TFunction } from 'i18next'
import type { TasteProfileIcons } from '@beerolog/icons'

export type BaselineTaste = {
  bubbles: number
  bitterness: number
  sweetness?: number
  body?: number
  abv_affinity?: number
  flavor_family: Record<string, number>
  novelty_affinity: number
  model_version?: number
  persona?: TastePersona | null
  updated_at: string
  icons?: TasteProfileIcons | null
  archetype?: { key: string } | null
}

export type TastePersona = {
  title_en: string
  blurb_en: string
  title_he: string
  blurb_he: string
}

// Pick the persona in the active UI language (Hebrew or English).
export function personaForLang(
  baseline: BaselineTaste,
  lang: string,
): { title: string; blurb: string } | null {
  const p = baseline.persona
  if (!p) return null
  return lang.startsWith('he')
    ? { title: p.title_he, blurb: p.blurb_he }
    : { title: p.title_en, blurb: p.blurb_en }
}

// Mirror of TASTE_MODEL_VERSION in the API; profiles below this are stale and
// must retake the (improved) quiz.
export const TASTE_MODEL_VERSION = 3

export function isStaleProfile(baseline: BaselineTaste): boolean {
  return (baseline.model_version ?? 0) < TASTE_MODEL_VERSION
}

function hourToTimeKey(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

export function timeAwareGreeting(t: TFunction, firstName?: string | null): string {
  const hour = new Date().getHours()
  const timeKey = hourToTimeKey(hour)
  const time = t(`greeting.${timeKey}`)
  return firstName ? t('greeting.named', { greeting: time, name: firstName }) : time
}

export function dominantFlavorKey(baseline: BaselineTaste): string {
  const top = Object.entries(baseline.flavor_family).sort(([, a], [, b]) => b - a)[0]?.[0]
  return top ?? 'default'
}

export function noveltyLabel(t: TFunction, baseline: BaselineTaste): string {
  return baseline.novelty_affinity > 0.5
    ? t('profile.novelty.explorer')
    : t('profile.novelty.comfort')
}

export function flavorTitle(t: TFunction, baseline: BaselineTaste): string | null {
  const topFlavors = Object.entries(baseline.flavor_family)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([key]) => flavorLabel(t, key))
  return topFlavors.length > 0 ? topFlavors.join(' & ') : null
}

export function flavorLabel(t: TFunction, key: string): string {
  return t(`flavors.${key}`, { defaultValue: key })
}

export function dialDescriptor(value: number, low: string, mid: string, high: string): string {
  if (value < 0.35) return low
  if (value > 0.65) return high
  return mid
}

export function profileHeadline(t: TFunction, baseline: BaselineTaste): string {
  const title = flavorTitle(t, baseline)
  const novelty = noveltyLabel(t, baseline)
  return title ? `${title} · ${novelty}` : novelty
}

export function topFlavorFamilies(
  t: TFunction,
  baseline: BaselineTaste,
  limit = 4,
): { key: string; label: string; value: number }[] {
  return Object.entries(baseline.flavor_family)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([key, value]) => ({ key, label: flavorLabel(t, key), value }))
}
