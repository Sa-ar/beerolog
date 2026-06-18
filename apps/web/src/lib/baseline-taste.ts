import type { TasteProfileIcons } from '@beerolog/icons'

export type BaselineTaste = {
  bubbles: number
  bitterness: number
  flavor_family: Record<string, number>
  novelty_affinity: number
  updated_at: string
  icons?: TasteProfileIcons | null
}

const FLAVOR_LABELS: Record<string, string> = {
  malty: 'Malty',
  hoppy: 'Hoppy',
  roasty: 'Roasty',
  fruity: 'Fruity',
  sour: 'Sour',
  smoky: 'Smoky',
}

export function timeAwareGreeting(firstName?: string | null): string {
  const hour = new Date().getHours()
  const time =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  return firstName ? `${time}, ${firstName}` : time
}

export function dominantFlavorKey(baseline: BaselineTaste): string {
  const top = Object.entries(baseline.flavor_family).sort(([, a], [, b]) => b - a)[0]?.[0]
  return top ?? 'default'
}

export function noveltyLabel(baseline: BaselineTaste): string {
  return baseline.novelty_affinity > 0.5 ? 'Flavor explorer' : 'Comfort seeker'
}

export function flavorTitle(baseline: BaselineTaste): string | null {
  const topFlavors = Object.entries(baseline.flavor_family)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([key]) => flavorLabel(key))
  return topFlavors.length > 0 ? topFlavors.join(' & ') : null
}

export function flavorLabel(key: string): string {
  return FLAVOR_LABELS[key] ?? key
}

export function dialDescriptor(value: number, low: string, mid: string, high: string): string {
  if (value < 0.35) return low
  if (value > 0.65) return high
  return mid
}

export function profileHeadline(baseline: BaselineTaste): string {
  const title = flavorTitle(baseline)
  const novelty = noveltyLabel(baseline)
  return title ? `${title} · ${novelty}` : novelty
}

export function topFlavorFamilies(
  baseline: BaselineTaste,
  limit = 4,
): { key: string; label: string; value: number }[] {
  return Object.entries(baseline.flavor_family)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([key, value]) => ({ key, label: flavorLabel(key), value }))
}
