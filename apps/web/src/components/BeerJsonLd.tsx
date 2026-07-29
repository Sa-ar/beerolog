/**
 * schema.org JSON-LD for the beer list so LLM browsers / crawlers can read the
 * catalog as structured data. schema.org has no Beer type -> Product.
 * Rendered on /try (guest results, quiz-gated from bare crawlers) and on the
 * public /catalog index (#278), where the whole list is crawlable.
 */
// Structural subset of the fields the markup reads, so both guest results
// (GuestRecommendedBeer) and the public catalog (CatalogBeer) satisfy it.
export type BeerJsonLdItem = {
  name: string
  name_hebrew?: string | null
  brewery: string
  style: string
  abv: number
  image_url?: string | null
}

export function BeerJsonLd({ beers }: { beers: BeerJsonLdItem[] }) {
  if (beers.length === 0) return null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: beers.map((beer, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        name: beer.name,
        ...(beer.name_hebrew ? { alternateName: beer.name_hebrew } : {}),
        category: beer.style,
        brand: { '@type': 'Brand', name: beer.brewery },
        ...(beer.image_url ? { image: beer.image_url } : {}),
        additionalProperty: [
          { '@type': 'PropertyValue', name: 'ABV', value: beer.abv, unitText: 'PERCENT' },
        ],
      },
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
