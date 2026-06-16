const MENU_IDS_KEY = 'beerolog_menu_ids'

export const MIN_MENU_BEERS = 3

export function getMenuBeerIds(): string[] {
  if (typeof window === 'undefined') return []
  const raw = sessionStorage.getItem(MENU_IDS_KEY)
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function setMenuBeerIds(ids: string[]): void {
  sessionStorage.setItem(MENU_IDS_KEY, JSON.stringify(ids))
}

export function clearMenuBeerIds(): void {
  sessionStorage.removeItem(MENU_IDS_KEY)
}

export function hasEnoughMenuBeers(ids: string[] = getMenuBeerIds()): boolean {
  return ids.length >= MIN_MENU_BEERS
}

export function filterCatalogByMenuIds<T extends { id: string }>(
  catalog: T[],
  menuIds: string[],
): T[] {
  const idSet = new Set(menuIds)
  return catalog.filter((beer) => idSet.has(beer.id))
}
