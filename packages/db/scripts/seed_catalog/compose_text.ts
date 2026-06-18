/**
 * composeBeerText: deterministic template producing the embedding-source
 * string for a beer. PRD §Implementation Decisions locks this template;
 * changing it requires a full re-embed.
 *
 * Optional clauses drop out when fields are null — the embedding model
 * handles absence fine but trips on noise like "Hops: null."
 */

import type { NormalisedBeer } from './normalise_row'
import { composeBeerSensoryBridge } from './sensory_bridge'

export function composeBeerText(beer: NormalisedBeer): string {
  const parts: string[] = []
  parts.push(`${beer.style} from ${beer.brewery}, ${beer.breweryCountry}.`)
  const abvIbu = beer.ibu != null
    ? `${beer.abv}% ABV, IBU ${beer.ibu}.`
    : `${beer.abv}% ABV.`
  parts.push(abvIbu)
  if (beer.hops && beer.hops.length) parts.push(`Hops: ${beer.hops.join(', ')}.`)
  if (beer.malts && beer.malts.length) parts.push(`Malts: ${beer.malts.join(', ')}.`)
  if (beer.yeast) parts.push(`${beer.yeast} yeast.`)

  const colorPart = `${beer.color} colour`
  const bodyPart = beer.body ? `, ${beer.body} body` : ''
  const sweetPart = beer.sweetness ? `, ${beer.sweetness} finish` : ''
  parts.push(`${colorPart}${bodyPart}${sweetPart}.`)

  if (beer.tastingNotes) parts.push(beer.tastingNotes)

  const sensory = composeBeerSensoryBridge({
    style: beer.style,
    abv: beer.abv,
    ibu: beer.ibu,
    hops: beer.hops,
    body: beer.body,
    sweetness: beer.sweetness,
  })
  if (sensory) parts.push(sensory)

  return parts.join(' ')
}
