/**
 * Cross-sensory bridge for beer embedding text.
 *
 * Maps structured beer fields to the same everyday flavor language used in
 * BaselineTaste onboarding (coffee, snacks, citrus, carbonation). Keeps
 * composeBeerText's catalog clauses intact and appends a deterministic
 * sensory profile clause. Template changes require a full catalog re-embed.
 */

export type BeerSensoryInput = {
  style: string
  abv: number
  ibu: number | null
  hops: string[] | null
  body: 'light' | 'medium' | 'full' | null
  sweetness: 'dry' | 'balanced' | 'sweet' | null
}

/** Hop name → cross-sensory descriptors (probe_hops.py gate). */
const HOP_DESCRIPTORS: Readonly<Record<string, string>> = {
  Citra: 'tropical citrus grapefruit passionfruit',
  Mosaic: 'stone fruit mango blueberry tangerine',
  Saaz: 'noble herbal earthy spicy mild',
  Cascade: 'grapefruit citrus floral pine',
  Centennial: 'floral citrus grapefruit clean bitter',
  Simcoe: 'piney resinous passionfruit dank earthy',
  Galaxy: 'passionfruit citrus peach',
  Amarillo: 'orange floral lemon citrus',
  Hallertau: 'noble herbal mild grassy',
  Magnum: 'clean bitter neutral high alpha',
  Fuggle: 'earthy herbal mild traditional',
  'Nelson Sauvin': 'white wine gooseberry tropical',
  'Sorachi Ace': 'lemon dill cilantro',
  Chinook: 'piney spicy grapefruit',
  'Idaho 7': 'tropical pine berry',
  Strata: 'strawberry passionfruit dank',
  Sabro: 'coconut tropical melon stone fruit',
  Riwaka: 'grapefruit lime citrus',
  Tettnang: 'floral noble mild herbal',
  'East Kent Goldings': 'earthy floral honey',
}

const STYLE_SENSORY_RULES: ReadonlyArray<{ pattern: RegExp; phrase: string }> = [
  {
    pattern: /imperial\s*stout|russian\s*imperial/i,
    phrase:
      'Feels intense like espresso and dark chocolate. Warming like smoked BBQ. Low carbonation like still water.',
  },
  {
    pattern: /\bstout\b/i,
    phrase:
      'Feels rich like dark chocolate and halva. Low carbonation like still water.',
  },
  {
    pattern: /porter|brown\s*ale/i,
    phrase:
      'Feels malty like halva and milk chocolate. Moderate bitterness like black coffee.',
  },
  {
    pattern: /double\s*ipa|dipa|triple\s*ipa|\bipa\b|india\s*pale/i,
    phrase:
      'Feels like grapefruit juice and dark chocolate bitterness. Strongly carbonated like im gaz.',
  },
  {
    pattern: /pale\s*ale/i,
    phrase:
      'Bright citrus like orange juice. Moderate bitterness like black coffee.',
  },
  {
    pattern: /pilsner|kölsch|kolsch/i,
    phrase:
      'Crisp and refreshing like sparkling water. Clean mild bitterness.',
  },
  {
    pattern: /\blager\b/i,
    phrase: 'Crisp and easy like lemonade. Light carbonation.',
  },
  {
    pattern: /wheat|hefeweizen|witbier|weiss/i,
    phrase: 'Soft and fruity like fresh fruit. Lightly carbonated.',
  },
  {
    pattern: /gose/i,
    phrase: 'Tart and bright like pickles and amba. Lively carbonation.',
  },
  {
    pattern: /sour|gueuze|lambic|berliner/i,
    phrase: 'Tart fermented like sauerkraut, pickles, and amba.',
  },
  {
    pattern: /barleywine|old\s*ale/i,
    phrase: 'Rich and warming like dark chocolate. Low carbonation.',
  },
]

function hopDescriptor(hop: string): string | null {
  const key = Object.keys(HOP_DESCRIPTORS).find(
    (name) => name.toLowerCase() === hop.toLowerCase(),
  )
  return key ? HOP_DESCRIPTORS[key]! : null
}

function expandHops(hops: string[] | null): string | null {
  if (!hops?.length) return null
  const expanded: string[] = []
  for (const hop of hops.slice(0, 4)) {
    const desc = hopDescriptor(hop)
    expanded.push(desc ? `${hop} (${desc})` : hop)
  }
  return expanded.length ? `Hop character: ${expanded.join(', ')}.` : null
}

function styleSensoryPhrase(style: string): string | null {
  for (const rule of STYLE_SENSORY_RULES) {
    if (rule.pattern.test(style)) return rule.phrase
  }
  return null
}

function bitternessPhrase(ibu: number | null, style: string): string | null {
  if (ibu != null) {
    if (ibu >= 55) return 'Bitterness like straight espresso or black coffee.'
    if (ibu >= 35) return 'Bitterness like black coffee.'
    if (ibu >= 20) return 'Mild bitterness like milky coffee.'
    return 'Very low bitterness like iced sweet coffee.'
  }
  if (/ipa|imperial|double/i.test(style)) {
    return 'Bitterness like black coffee.'
  }
  if (/stout|porter/i.test(style)) {
    return 'Roasty bitterness like dark chocolate.'
  }
  return null
}

function bodyCarbonationPhrase(body: BeerSensoryInput['body']): string | null {
  if (body === 'light') return 'Light body, lively carbonation like sparkling water.'
  if (body === 'full') return 'Full body, softer carbonation like still water.'
  if (body === 'medium') return 'Medium body, moderate carbonation.'
  return null
}

function sweetnessPhrase(sweetness: BeerSensoryInput['sweetness']): string | null {
  if (sweetness === 'sweet') return 'Sweet finish like milk chocolate.'
  if (sweetness === 'dry') return 'Dry finish like dark chocolate.'
  if (sweetness === 'balanced') return 'Balanced sweetness like halva.'
  return null
}

/** Deterministic cross-sensory clause appended to beer embedding text. */
export function composeBeerSensoryBridge(beer: BeerSensoryInput): string {
  const clauses: string[] = []
  const stylePhrase = styleSensoryPhrase(beer.style)
  if (stylePhrase) clauses.push(`Sensory profile: ${stylePhrase}`)

  const hopPhrase = expandHops(beer.hops)
  if (hopPhrase) clauses.push(hopPhrase)

  const bitter = bitternessPhrase(beer.ibu, beer.style)
  if (bitter) clauses.push(bitter)

  const bodyPhrase = bodyCarbonationPhrase(beer.body)
  if (bodyPhrase) clauses.push(bodyPhrase)

  const sweetPhrase = sweetnessPhrase(beer.sweetness)
  if (sweetPhrase) clauses.push(sweetPhrase)

  return clauses.join(' ')
}
