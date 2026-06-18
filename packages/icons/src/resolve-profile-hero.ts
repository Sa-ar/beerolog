import { buildFlavorSvg, buildIconByPurpose } from './icon-factory'
import { resolveTasteProfileIconRequests } from './taste-profile'
import type { BaselineTasteDials, TasteProfileIcons } from './types'

export function resolveProfileHeroSvg(
  dials: BaselineTasteDials,
  icons?: TasteProfileIcons | null,
): string | null {
  if (icons?.hero.svg) return icons.hero.svg

  const requests = resolveTasteProfileIconRequests(dials)
  const hero = requests.find((r) => r.slot === 'hero')
  if (hero) {
    const fromPurpose = buildIconByPurpose(hero.purpose)
    if (fromPurpose) return fromPurpose
  }

  const dominant = Object.entries(dials.flavor_family).sort(([, a], [, b]) => b - a)[0]?.[0]
  if (dominant) return buildFlavorSvg(dominant)

  return null
}
