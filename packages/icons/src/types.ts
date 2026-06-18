export type CatalogIconGroup =
  | 'session.vibe'
  | 'session.abv'
  | 'journey'
  | 'flavor'
  | 'marketing'

export type CatalogIconItem = {
  key: string
  purpose: string
  svg: string
}

export type IconCatalog = {
  session_vibes: CatalogIconItem[]
  session_abv: CatalogIconItem[]
  journey: CatalogIconItem[]
  flavors: CatalogIconItem[]
  marketing: CatalogIconItem[]
}

export type TasteProfileIcon = {
  purpose: string
  flavor_key?: string | null
  svg: string
}

export type TasteProfileIcons = {
  hero: TasteProfileIcon
  flavors: TasteProfileIcon[]
}

export type BaselineTasteDials = {
  bubbles: number
  bitterness: number
  flavor_family: Record<string, number>
  novelty_affinity: number
}

export type IconRequest = {
  purpose: string
  description: string
  flavorKey?: string
  slot: 'hero' | 'flavor'
}
