import { describe, expect, it } from 'vitest'

import { renderWithI18n } from '../test/render'
import { BeerJsonLd } from './BeerJsonLd'
import type { GuestRecommendedBeer } from '../lib/guest-answers'

function beer(n: number, overrides: Partial<GuestRecommendedBeer> = {}): GuestRecommendedBeer {
  return {
    id: `b${n}`,
    name: `Beer ${n}`,
    name_hebrew: null,
    brewery: `Brewery ${n}`,
    style: 'IPA',
    abv: 6.5,
    color: 'gold',
    image_url: null,
    ...overrides,
  } as GuestRecommendedBeer
}

function parseJsonLd(container: HTMLElement) {
  const script = container.querySelector('script[type="application/ld+json"]')
  expect(script).not.toBeNull()
  return JSON.parse(script!.textContent!)
}

describe('BeerJsonLd', () => {
  it('renders an ItemList of Product with mapped beer fields', () => {
    const { container } = renderWithI18n(
      <BeerJsonLd
        beers={[
          beer(1, { name_hebrew: 'בירה', image_url: 'https://img/1.png' }),
          beer(2),
        ]}
      />,
    )
    const data = parseJsonLd(container)
    expect(data['@type']).toBe('ItemList')
    expect(data.itemListElement).toHaveLength(2)

    const first = data.itemListElement[0]
    expect(first['@type']).toBe('ListItem')
    expect(first.position).toBe(1)
    expect(first.item['@type']).toBe('Product')
    expect(first.item.name).toBe('Beer 1')
    expect(first.item.alternateName).toBe('בירה')
    expect(first.item.category).toBe('IPA')
    expect(first.item.brand).toEqual({ '@type': 'Brand', name: 'Brewery 1' })
    expect(first.item.image).toBe('https://img/1.png')
    expect(first.item.additionalProperty[0]).toMatchObject({
      '@type': 'PropertyValue',
      name: 'ABV',
      value: 6.5,
    })
  })

  it('omits optional fields when absent', () => {
    const { container } = renderWithI18n(<BeerJsonLd beers={[beer(1)]} />)
    const item = parseJsonLd(container).itemListElement[0].item
    expect(item).not.toHaveProperty('alternateName')
    expect(item).not.toHaveProperty('image')
  })

  it('renders nothing for an empty list', () => {
    const { container } = renderWithI18n(<BeerJsonLd beers={[]} />)
    expect(container.querySelector('script[type="application/ld+json"]')).toBeNull()
  })
})
