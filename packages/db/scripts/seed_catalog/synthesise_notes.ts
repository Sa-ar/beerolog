/**
 * Template-based tasting notes when brewery copy is unavailable.
 * PRD allows LLM fallback; this deterministic version unblocks catalog ingest.
 */

export function synthesiseNotes(
  style: string,
  abv: number,
  brewery: string,
  nameHebrew: string | null,
): { notes: string; lang: 'he' | 'en' } {
  const styleLower = style.toLowerCase()
  let character = 'balanced malt and hop character'
  if (/stout|porter/.test(styleLower)) character = 'roasty malt, cocoa, and a smooth body'
  else if (/ipa|pale ale/.test(styleLower)) character = 'hop-forward aroma with citrus and pine'
  else if (/wheat|hefe|wit/.test(styleLower)) character = 'soft grainy malt with light fruit and spice'
  else if (/lager|pilsner|helles/.test(styleLower)) character = 'clean, crisp malt with a dry finish'
  else if (/amber|red ale/.test(styleLower)) character = 'caramel malt sweetness with moderate bitterness'
  else if (/sour|lambic|gose/.test(styleLower)) character = 'tangy, fruity acidity with a dry finish'
  else if (/mead|cyser|melomel/.test(styleLower)) character = 'honey sweetness with fermented fruit notes'
  else if (/cider/.test(styleLower)) character = 'apple fruit character with a refreshing finish'

  if (nameHebrew) {
    return {
      notes: `${style} מ${brewery}. ${abv}% אלכוהול. ${character}.`,
      lang: 'he',
    }
  }

  return {
    notes: `A ${style.toLowerCase()} from ${brewery} at ${abv}% ABV. ${character}.`,
    lang: 'en',
  }
}
