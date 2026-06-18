import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { catalogLookup, fetchIconCatalog } from './catalog'
import type { CatalogIconGroup } from './types'
import type { IconCatalog } from './types'

type IconCatalogContextValue = {
  catalog: IconCatalog | null
  loading: boolean
}

const IconCatalogContext = createContext<IconCatalogContextValue>({
  catalog: null,
  loading: true,
})

export function IconCatalogProvider({
  apiUrl,
  children,
}: {
  apiUrl: string
  children: ReactNode
}) {
  const [catalog, setCatalog] = useState<IconCatalog | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const result = await fetchIconCatalog(apiUrl)
      if (!cancelled) {
        setCatalog(result)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [apiUrl])

  const value = useMemo(() => ({ catalog, loading }), [catalog, loading])

  return <IconCatalogContext.Provider value={value}>{children}</IconCatalogContext.Provider>
}

export function useIconCatalog() {
  return useContext(IconCatalogContext)
}

const GROUP_TO_CATALOG_KEY: Record<CatalogIconGroup, keyof IconCatalog> = {
  'session.vibe': 'session_vibes',
  'session.abv': 'session_abv',
  journey: 'journey',
  flavor: 'flavors',
  marketing: 'marketing',
}

export function useCatalogSvg(group: CatalogIconGroup, iconKey: string): string | null {
  const { catalog } = useIconCatalog()
  return catalogLookup(catalog, GROUP_TO_CATALOG_KEY[group], iconKey)
}
