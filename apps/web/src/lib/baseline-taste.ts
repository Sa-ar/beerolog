import type { TFunction } from 'i18next'
import type { TasteProfileIcons } from '@beerolog/icons'

export type BaselineTaste = {
  bubbles: number
  bitterness: number
  flavor_family: Record<string, number>
  novelty_affinity: number
  updated_at: string
  icons?: TasteProfileIcons | null
}

export function timeAwareGreeting(t: TFunction, firstName?: string | null): string {
  const hour = new Date().getHours()
  const timeKey = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
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
