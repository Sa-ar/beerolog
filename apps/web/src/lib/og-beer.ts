// Pure model for the beer OG card (#277) so it's unit-tested without rendering.
export type BeerOgInput = { name: string; brewery: string; style: string; abv: number }

export function beerOgSubtitle(beer: BeerOgInput): string {
  return `${beer.brewery} · ${beer.style} · ${beer.abv}% ABV`
}
