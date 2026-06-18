export type BeerColor = 'pale' | 'gold' | 'amber' | 'brown' | 'dark'

const BEER_COLORS: BeerColor[] = ['pale', 'gold', 'amber', 'brown', 'dark']

export const BEER_COLOR_LABEL: Record<BeerColor, string> = {
  pale: 'Pale',
  gold: 'Golden',
  amber: 'Amber',
  brown: 'Brown',
  dark: 'Dark',
}

/** Liquid fill for the pint-glass swatch (light → dark). */
export const BEER_COLOR_FILL: Record<BeerColor, string> = {
  pale: 'hsl(48 72% 88%)',
  gold: 'hsl(42 78% 58%)',
  amber: 'hsl(32 72% 46%)',
  brown: 'hsl(25 52% 30%)',
  dark: 'hsl(20 42% 14%)',
}

export const BEER_COLOR_GLOW: Record<BeerColor, string> = {
  pale: 'hsl(48 72% 88% / 0.45)',
  gold: 'hsl(42 78% 58% / 0.35)',
  amber: 'hsl(32 72% 46% / 0.35)',
  brown: 'hsl(25 52% 30% / 0.35)',
  dark: 'hsl(20 42% 14% / 0.4)',
}

export function isBeerColor(value: string): value is BeerColor {
  return (BEER_COLORS as string[]).includes(value)
}

/** Mirrors packages/db seed_catalog deriveColor — style fallback when API omits color. */
export function deriveBeerColor(style: string, rawColor?: string | null): BeerColor {
  if (rawColor && isBeerColor(rawColor.toLowerCase())) {
    return rawColor.toLowerCase() as BeerColor
  }
  const lowerStyle = style.toLowerCase()
  if (/stout|porter/.test(lowerStyle)) return 'dark'
  if (/brown\s*ale|dunkel|bock/.test(lowerStyle)) return 'brown'
  if (/amber|red\s*ale|ipa/.test(lowerStyle)) return 'amber'
  if (/wheat|witbier|gose|saison|pale\s*ale/.test(lowerStyle)) return 'pale'
  if (/lager|pilsner/.test(lowerStyle)) return 'gold'
  return 'gold'
}
