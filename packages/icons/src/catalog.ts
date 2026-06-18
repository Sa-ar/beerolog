import type { IconCatalog } from './types'

export async function fetchIconCatalog(apiUrl: string): Promise<IconCatalog | null> {
  try {
    const res = await fetch(`${apiUrl}/icons/catalog`)
    if (!res.ok) return null
    return (await res.json()) as IconCatalog
  } catch {
    return null
  }
}

export function catalogLookup(
  catalog: IconCatalog | null,
  group: keyof IconCatalog,
  key: string,
): string | null {
  if (!catalog) return null
  const item = catalog[group].find((entry) => entry.key === key)
  return item?.svg ?? null
}
