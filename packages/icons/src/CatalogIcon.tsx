import { GeneratedTasteIcon } from './GeneratedTasteIcon'
import { useCatalogSvg } from './IconCatalogProvider'
import { staticCatalogSvg } from './static-catalog'
import type { CatalogIconGroup } from './types'

type CatalogIconProps = {
  group: CatalogIconGroup
  iconKey: string
  className?: string
  svg?: string | null
}

export function CatalogIcon({ group, iconKey, className, svg }: CatalogIconProps) {
  const catalogSvg = useCatalogSvg(group, iconKey)
  const curated = staticCatalogSvg(group, iconKey)
  const resolved = curated ?? svg ?? catalogSvg

  if (!resolved) return null

  return <GeneratedTasteIcon svg={resolved} className={className ?? 'h-8 w-8'} />
}
