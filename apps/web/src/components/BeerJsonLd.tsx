/**
 * schema.org JSON-LD for the beer list so LLM browsers / crawlers can read the
 * catalog as structured data. schema.org has no Beer type -> Product.
 * ponytail: rendered on /try where guest results already exist; a dedicated
 * crawlable /catalog page is deferred (the quiz gates this list from bare
 * crawlers, but assistant browsers that complete the flow get the markup).
 */
import type { GuestRecommendedBeer } from '../lib/guest-answers'

export function BeerJsonLd({ beers }: { beers: GuestRecommendedBeer[] }) {
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
