import { buildCatalogSvg } from './icon-factory'
import type { CatalogIconGroup } from './types'

export type { CatalogIconGroup }

export function staticFlavorSvg(flavor: string, _className?: string): string | null {
  return buildCatalogSvg('flavor', flavor)
}

export function staticVibeSvg(vibe: string, _className?: string): string | null {
  return buildCatalogSvg('session.vibe', vibe)
}

export function staticAbvSvg(level: string, _className?: string): string | null {
  return buildCatalogSvg('session.abv', level)
}

export function staticJourneySvg(step: string, _className?: string): string | null {
  return buildCatalogSvg('journey', step)
}

export function staticMarketingSvg(key: string, _className?: string): string | null {
  return buildCatalogSvg('marketing', key)
}

export function staticCatalogSvg(group: CatalogIconGroup, iconKey: string): string | null {
  return buildCatalogSvg(group, iconKey)
}
