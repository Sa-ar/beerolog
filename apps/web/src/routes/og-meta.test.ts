import { describe, expect, it } from 'vitest'
import { beerHead } from './beer.$id'
import { tryHead } from './try'

type Meta = Array<Record<string, string>>
const prop = (meta: Meta, p: string) => meta.find((m) => m.property === p)?.content

describe('og:image + share meta (#309)', () => {
  it('/beer emits og:image from the beer photo + a title', () => {
    const out = beerHead({
      loaderData: {
        beer: { id: 'b1', name: 'Alpha IPA', brewery: 'Acme', style: 'IPA', abv: 5.5, image_url: 'https://blob/x.png' },
      },
    }) as { meta: Meta }
    expect(prop(out.meta, 'og:image')).toBe('https://blob/x.png')
    expect(prop(out.meta, 'og:title')).toContain('Alpha IPA')
    expect(out.meta.find((m) => m.name === 'twitter:card')?.content).toBe('summary_large_image')
  })

  it('/beer falls back to a summary card (no og:image) when the photo is missing', () => {
    const out = beerHead({
      loaderData: { beer: { id: 'b2', name: 'No Photo', brewery: 'Acme', style: 'Lager', abv: 4 } },
    }) as { meta: Meta }
    expect(prop(out.meta, 'og:image')).toBeUndefined()
    expect(out.meta.find((m) => m.name === 'twitter:card')?.content).toBe('summary')
  })

  it('/beer emits no meta when the beer is not found', () => {
    expect(beerHead({ loaderData: { beer: null } })).toEqual({})
  })

  it('/try emits a share title + description', () => {
    const out = tryHead('en') as { meta: Meta }
    expect(prop(out.meta, 'og:title')).toContain('Beerolog')
    expect(prop(out.meta, 'og:description')).toBeTruthy()
  })
})
