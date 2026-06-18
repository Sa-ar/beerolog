import type { BaselineTasteDials, IconRequest } from './types'

const FLAVOR_LABELS: Record<string, string> = {
  malty: 'Malty',
  hoppy: 'Hoppy',
  roasty: 'Roasty',
  fruity: 'Fruity',
  sour: 'Sour',
  smoky: 'Smoky',
}

function noveltyLabel(noveltyAffinity: number): string {
  return noveltyAffinity > 0.5 ? 'flavor explorer' : 'comfort seeker'
}

function flavorLabel(key: string): string {
  return FLAVOR_LABELS[key] ?? key
}

function topFlavors(
  flavorFamily: Record<string, number>,
  limit = 4,
): [string, number][] {
  return Object.entries(flavorFamily)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
}

export function resolveTasteProfileIconRequests(dials: BaselineTasteDials): IconRequest[] {
  const top = topFlavors(dials.flavor_family, 4)
  if (top.length === 0) return []

  const novelty = noveltyLabel(dials.novelty_affinity)
  const topKeys = top.slice(0, 2).map(([key]) => key)
  const heroKeys = topKeys.length > 1 ? topKeys.join('+') : topKeys[0]!
  const heroPurpose = `taste-profile:hero:${heroKeys}`
  const heroDescription = `Profile icon: ${heroKeys}, ${novelty}. 32×32 beer line-art.`

  const requests: IconRequest[] = [
    {
      purpose: heroPurpose,
      description: heroDescription,
      slot: 'hero',
    },
  ]

  const seen = new Set<string>([heroPurpose])
  for (const [key] of top) {
    const purpose = `taste-profile:flavor:${key}`
    if (seen.has(purpose)) continue
    seen.add(purpose)
    const label = flavorLabel(key)
    requests.push({
      purpose,
      description:
        `Hand-drawn beer taste icon representing ${label.toLowerCase()} ` +
        `flavor family. Simple line-art SVG.`,
      flavorKey: key,
      slot: 'flavor',
    })
  }

  return requests
}
