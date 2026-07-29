import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// Interpolate router params/search into the href so we can assert the crawlable
// links actually resolve to /beer/<id> detail pages.
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
  Link: ({
    to,
    params,
    search,
    children,
    ...rest
  }: {
    to: string
    params?: Record<string, unknown>
    search?: Record<string, unknown>
    children: React.ReactNode
  }) => {
    let href = to
    if (params) {
      for (const [k, v] of Object.entries(params)) href = href.replace(`$${k}`, String(v))
    }
    if (search) {
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(search).map(([k, v]) => [k, String(v)])),
      ).toString()
      if (qs) href += `?${qs}`
    }
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    )
  },
}))

import { renderWithI18n } from '../test/render'
import { CatalogIndexView } from './catalog'

type CatalogBeer = Parameters<typeof CatalogIndexView>[0]['beers'][number]

function beer(id: string, name: string, overrides: Partial<CatalogBeer> = {}): CatalogBeer {
  return {
    id,
    name,
    name_hebrew: null,
    brewery: 'Alexander',
    style: 'American IPA',
    abv: 6.2,
    market_tier: 'craft',
    color: 'amber',
    image_url: null,
    adventurousness: 0.55,
    ibu: 60,
    ...overrides,
  }
}

describe('CatalogIndexView', () => {
  it('renders a single h1 and crawlable links to /beer/$id for each beer', () => {
    renderWithI18n(
      <CatalogIndexView
        beers={[beer('b1', 'Alexander Blazer'), beer('b2', 'Malka Blonde')]}
        page={1}
        pageSize={60}
        total={2}
      />,
      'en',
    )

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)

    const first = screen.getByRole('link', { name: /Alexander Blazer/ })
    expect(first).toHaveAttribute('href', '/beer/b1')
    const second = screen.getByRole('link', { name: /Malka Blonde/ })
    expect(second).toHaveAttribute('href', '/beer/b2')
  })

  it('renders schema.org ItemList JSON-LD for the catalog', () => {
    const { container } = renderWithI18n(
      <CatalogIndexView beers={[beer('b1', 'Alexander Blazer')]} page={1} pageSize={60} total={1} />,
      'en',
    )
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()
    const data = JSON.parse(script!.textContent!)
    expect(data['@type']).toBe('ItemList')
    expect(data.itemListElement[0].item.name).toBe('Alexander Blazer')
  })

  it('shows prev/next pagination when there is more than one page', () => {
    renderWithI18n(
      <CatalogIndexView
        beers={[beer('b1', 'Alexander Blazer')]}
        page={2}
        pageSize={1}
        total={3}
      />,
      'en',
    )
    expect(screen.getByRole('link', { name: /Previous/ })).toHaveAttribute('href', '/catalog?page=1')
    expect(screen.getByRole('link', { name: /Next/ })).toHaveAttribute('href', '/catalog?page=3')
  })
})
