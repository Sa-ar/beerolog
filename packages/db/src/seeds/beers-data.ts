import type { BeerStyle } from '@beerolog/types'

// [bitterness, sweetness, fruitiness, roast, sourness, body, adventure]
type FV = [number, number, number, number, number, number, number]

type BeerSeed = {
  name: string
  brewery: string
  style: BeerStyle
  abv: number
  description: string
  fv: FV
  tags: string[]
}

const b = (
  name: string, brewery: string, style: BeerStyle, abv: number,
  fv: FV, tags: string[], description = ''
): BeerSeed => ({ name, brewery, style, abv, description, fv, tags })

export const BEER_SEEDS: BeerSeed[] = [
  // ── Lager / Pilsner ──────────────────────────────────────────────────────
  b('Heineken', 'Heineken', 'lager', 5.0, [0.25,0.15,0.1,0.0,0.0,0.25,0.15], ['crisp','easy-drinking'], 'Clean Dutch lager, light and refreshing.'),
  b('Stella Artois', 'AB InBev', 'pilsner', 5.2, [0.22,0.14,0.08,0.0,0.0,0.28,0.15], ['crisp','classic']),
  b('Corona Extra', 'Grupo Modelo', 'lager', 4.6, [0.15,0.1,0.12,0.0,0.02,0.2,0.15], ['light','refreshing','citrus']),
  b('Modelo Especial', 'Grupo Modelo', 'lager', 4.4, [0.2,0.15,0.1,0.0,0.0,0.25,0.15], ['crisp','light']),
  b('Miller Lite', 'Miller Brewing', 'lager', 4.2, [0.15,0.08,0.05,0.0,0.0,0.15,0.1], ['light','sessionable']),
  b('Bud Light', 'Anheuser-Busch', 'lager', 4.2, [0.12,0.08,0.04,0.0,0.0,0.12,0.1], ['light','easy-drinking']),
  b('Coors Banquet', 'Coors Brewing', 'lager', 5.0, [0.18,0.1,0.06,0.0,0.0,0.22,0.12], ['crisp','classic']),
  b('Pilsner Urquell', 'Pilsner Urquell', 'pilsner', 4.4, [0.45,0.12,0.08,0.0,0.0,0.35,0.3], ['hoppy','crisp','classic'], 'The original Czech pilsner — noticeably bitter and crisp.'),
  b('Peroni Nastro Azzurro', 'Birra Peroni', 'pilsner', 5.1, [0.22,0.1,0.08,0.0,0.0,0.28,0.18], ['crisp','light']),
  b('Asahi Super Dry', 'Asahi', 'lager', 5.0, [0.25,0.05,0.05,0.0,0.0,0.2,0.2], ['crisp','dry','clean']),
  b('Sapporo Premium', 'Sapporo', 'lager', 4.9, [0.2,0.1,0.06,0.0,0.0,0.22,0.18], ['crisp','light']),
  b('Beck\'s', 'Brauerei Beck', 'pilsner', 5.0, [0.3,0.12,0.08,0.0,0.0,0.3,0.2], ['crisp','balanced']),
  b('Warsteiner Premium', 'Warsteiner', 'pilsner', 4.8, [0.28,0.12,0.08,0.0,0.0,0.32,0.2], ['crisp','classic']),
  b('Singha', 'Boon Rawd', 'lager', 5.0, [0.22,0.12,0.1,0.0,0.0,0.25,0.18], ['light','crisp']),
  b('Tiger', 'Tiger Beer', 'lager', 5.0, [0.2,0.1,0.08,0.0,0.0,0.22,0.18], ['light','refreshing']),
  b('Kirin Ichiban', 'Kirin', 'lager', 5.0, [0.22,0.08,0.06,0.0,0.0,0.22,0.18], ['crisp','dry']),

  // ── Kölsch ───────────────────────────────────────────────────────────────
  b('Reissdorf Kölsch', 'Reissdorf', 'kolsch', 4.8, [0.2,0.2,0.25,0.0,0.05,0.28,0.22], ['light','fruity','crisp'], 'Soft and delicate with a hint of fruit.'),
  b('Früh Kölsch', 'Früh', 'kolsch', 4.8, [0.18,0.22,0.22,0.0,0.05,0.25,0.2], ['light','refreshing']),
  b('Gaffel Kölsch', 'Gaffel', 'kolsch', 4.8, [0.2,0.18,0.2,0.0,0.05,0.27,0.22], ['crisp','subtle']),

  // ── Wheat / Hefeweizen ───────────────────────────────────────────────────
  b('Hoegaarden White', 'Hoegaarden', 'wheat', 4.9, [0.15,0.3,0.5,0.0,0.12,0.4,0.3], ['fruity','spiced','easy'], 'Belgian witbier brewed with coriander and orange peel.'),
  b('Blue Moon Belgian White', 'Blue Moon', 'wheat', 5.4, [0.15,0.35,0.5,0.0,0.1,0.42,0.28], ['fruity','smooth','citrus']),
  b('Allagash White', 'Allagash Brewing', 'wheat', 5.2, [0.18,0.28,0.55,0.0,0.12,0.4,0.35], ['fruity','spiced','complex']),
  b('Weihenstephaner Hefeweissbier', 'Weihenstephan', 'wheat', 5.4, [0.15,0.25,0.55,0.0,0.08,0.45,0.3], ['banana','clove','classic'], 'The world\'s oldest brewery\'s classic hefeweizen.'),
  b('Erdinger Weissbier', 'Erdinger', 'wheat', 5.3, [0.15,0.28,0.52,0.0,0.08,0.42,0.28], ['fruity','smooth']),
  b('Paulaner Hefeweizen', 'Paulaner', 'wheat', 5.5, [0.18,0.25,0.5,0.0,0.1,0.45,0.3], ['banana','balanced']),
  b('Schneider Weisse Original', 'Schneider', 'wheat', 5.4, [0.2,0.3,0.55,0.0,0.08,0.5,0.32], ['spicy','fruity','rich']),
  b('Franziskaner Hefeweisse', 'Franziskaner', 'wheat', 5.0, [0.15,0.3,0.55,0.0,0.08,0.45,0.28], ['soft','banana','refreshing']),
  b('Shock Top Belgian White', 'Shock Top', 'wheat', 5.2, [0.15,0.32,0.45,0.0,0.1,0.4,0.25], ['citrus','smooth']),
  b('Wittekerke', 'Bavik', 'wheat', 5.0, [0.15,0.25,0.5,0.0,0.12,0.38,0.3], ['fruity','light']),

  // ── Pale Ale ─────────────────────────────────────────────────────────────
  b('Sierra Nevada Pale Ale', 'Sierra Nevada', 'pale_ale', 5.6, [0.45,0.15,0.45,0.05,0.05,0.42,0.42], ['hoppy','piney','balanced'], 'The beer that defined American craft pale ale.'),
  b('Firestone Walker 805', 'Firestone Walker', 'pale_ale', 4.7, [0.28,0.18,0.35,0.05,0.05,0.38,0.3], ['smooth','easy','light-hop']),
  b('Anchor Steam Beer', 'Anchor Brewing', 'pale_ale', 4.9, [0.35,0.2,0.25,0.08,0.05,0.45,0.35], ['balanced','toasty','classic']),
  b('Deschutes Mirror Pond', 'Deschutes Brewery', 'pale_ale', 5.0, [0.42,0.15,0.42,0.05,0.05,0.4,0.4], ['hoppy','crisp','citrus']),
  b('Kona Big Wave', 'Kona Brewing', 'pale_ale', 4.4, [0.22,0.18,0.35,0.05,0.05,0.35,0.28], ['tropical','smooth','easy']),
  b('Redhook ESB', 'Redhook', 'pale_ale', 5.8, [0.35,0.28,0.25,0.12,0.05,0.5,0.3], ['malty','balanced','English-style']),
  b('Fat Tire Amber Ale', 'New Belgium', 'amber_ale', 5.2, [0.3,0.35,0.2,0.18,0.05,0.52,0.28], ['malty','balanced','smooth'], 'Iconic amber ale with toasty malt and light hops.'),
  b('New Belgium Voodoo Ranger Juicy Haze', 'New Belgium', 'pale_ale', 7.5, [0.45,0.15,0.75,0.05,0.08,0.48,0.5], ['juicy','tropical','hazy']),
  b('Brooklyn Lager', 'Brooklyn Brewery', 'lager', 5.2, [0.32,0.25,0.2,0.1,0.05,0.45,0.3], ['balanced','toasty','balanced']),

  // ── IPA ──────────────────────────────────────────────────────────────────
  b('Dogfish Head 60 Minute IPA', 'Dogfish Head', 'ipa', 6.0, [0.72,0.1,0.65,0.05,0.05,0.52,0.6], ['hoppy','citrus','resinous']),
  b('Stone IPA', 'Stone Brewing', 'ipa', 6.9, [0.78,0.08,0.6,0.08,0.05,0.52,0.65], ['piney','bitter','bold']),
  b('Lagunitas IPA', 'Lagunitas', 'ipa', 6.2, [0.72,0.1,0.65,0.05,0.05,0.52,0.6], ['citrus','piney','balanced']),
  b('Sierra Nevada Torpedo', 'Sierra Nevada', 'ipa', 7.2, [0.78,0.08,0.65,0.05,0.05,0.55,0.65], ['bold','hoppy','grapefruit']),
  b('Goose Island IPA', 'Goose Island', 'ipa', 5.9, [0.7,0.1,0.6,0.08,0.05,0.5,0.58], ['citrus','balanced','smooth']),
  b('Founders Centennial IPA', 'Founders Brewing', 'ipa', 7.2, [0.75,0.08,0.65,0.05,0.05,0.55,0.62], ['citrus','piney','bold']),
  b('Ballast Point Sculpin', 'Ballast Point', 'ipa', 7.0, [0.72,0.1,0.7,0.05,0.05,0.52,0.6], ['apricot','citrus','tropical']),
  b('Bell\'s Two Hearted Ale', 'Bell\'s Brewery', 'ipa', 7.0, [0.68,0.12,0.65,0.05,0.05,0.52,0.58], ['grapefruit','piney','smooth']),
  b('Russian River Pliny the Elder', 'Russian River', 'ipa', 8.0, [0.85,0.05,0.7,0.08,0.05,0.6,0.78], ['intensely-hoppy','resinous','legendary'], 'Double IPA legend — big bitter, big flavor.'),
  b('Tree House Julius', 'Tree House Brewing', 'ipa', 6.8, [0.35,0.15,0.85,0.05,0.08,0.5,0.65], ['juicy','tropical','hazy','low-bitter'], 'New England IPA — tropical fruit punch, pillowy soft.'),
  b('Voodoo Ranger American Haze', 'New Belgium', 'ipa', 5.0, [0.45,0.15,0.75,0.05,0.08,0.48,0.55], ['hazy','tropical','easy']),
  b('Elysian Space Dust IPA', 'Elysian Brewing', 'ipa', 8.2, [0.75,0.08,0.68,0.05,0.05,0.55,0.65], ['piney','citrus','bold']),
  b('Bear Republic Racer 5', 'Bear Republic', 'ipa', 7.5, [0.78,0.08,0.62,0.08,0.05,0.55,0.65], ['hoppy','bitter','classic']),
  b('Green Flash West Coast IPA', 'Green Flash', 'ipa', 8.1, [0.82,0.06,0.65,0.08,0.05,0.58,0.7], ['piney','resinous','bold']),
  b('Three Floyds Zombie Dust', 'Three Floyds', 'ipa', 6.4, [0.65,0.12,0.72,0.05,0.05,0.5,0.65], ['citrus','floral','aromatic']),
  b('Dogfish Head 90 Minute IPA', 'Dogfish Head', 'ipa', 9.0, [0.88,0.1,0.62,0.1,0.05,0.65,0.75], ['bold','intense','resinous']),
  b('Bell\'s Hopslam', 'Bell\'s Brewery', 'ipa', 10.0, [0.82,0.12,0.72,0.08,0.05,0.62,0.78], ['honey','citrus','massive'], 'Double IPA brewed with honey — extreme and legendary.'),
  b('Tröegs Perpetual IPA', 'Tröegs', 'ipa', 7.5, [0.75,0.08,0.68,0.08,0.05,0.55,0.65], ['piney','balanced','bold']),

  // ── Amber / Brown Ale ────────────────────────────────────────────────────
  b('Alaskan Amber', 'Alaskan Brewing', 'amber_ale', 5.3, [0.35,0.42,0.18,0.22,0.05,0.55,0.28], ['malty','smooth','toasty']),
  b('Samuel Adams Boston Lager', 'Boston Beer Co', 'vienna_lager', 5.0, [0.32,0.28,0.18,0.15,0.05,0.48,0.3], ['balanced','malty','crisp']),
  b('Newcastle Brown Ale', 'Newcastle', 'brown_ale', 4.7, [0.28,0.45,0.15,0.3,0.05,0.58,0.25], ['nutty','smooth','malty']),
  b('Samuel Smith Nut Brown Ale', 'Samuel Smith', 'brown_ale', 5.0, [0.28,0.48,0.12,0.35,0.05,0.62,0.3], ['nutty','rich','smooth']),
  b('Big Sky Moose Drool', 'Big Sky Brewing', 'brown_ale', 5.1, [0.3,0.45,0.15,0.32,0.05,0.6,0.28], ['chocolatey','smooth','malty']),
  b('Bell\'s Amber Ale', 'Bell\'s Brewery', 'amber_ale', 5.8, [0.35,0.4,0.2,0.25,0.05,0.55,0.32], ['malty','balanced']),
  b('Tröegs Nugget Nectar', 'Tröegs', 'amber_ale', 7.5, [0.65,0.3,0.55,0.15,0.05,0.65,0.65], ['hoppy','malty','bold'], 'Imperial amber ale — huge hops, huge malt.'),
  b('Deschutes Twilight Summer Ale', 'Deschutes Brewery', 'amber_ale', 5.4, [0.32,0.35,0.25,0.2,0.05,0.5,0.32], ['balanced','slightly-malty','approachable']),

  // ── Porter ───────────────────────────────────────────────────────────────
  b('Founders Porter', 'Founders Brewing', 'porter', 6.5, [0.45,0.35,0.1,0.75,0.05,0.7,0.42], ['chocolate','coffee','smooth'], 'Silky smooth with dark chocolate and espresso notes.'),
  b('Deschutes Black Butte Porter', 'Deschutes Brewery', 'porter', 5.2, [0.42,0.32,0.1,0.72,0.05,0.68,0.4], ['chocolate','roasty','sessionable']),
  b('Anchor Porter', 'Anchor Brewing', 'porter', 5.6, [0.4,0.3,0.1,0.7,0.05,0.65,0.38], ['roasty','chocolate','classic']),
  b('Great Lakes Edmund Fitzgerald', 'Great Lakes', 'porter', 5.8, [0.45,0.28,0.08,0.75,0.05,0.7,0.42], ['coffee','chocolate','complex']),
  b('Samuel Smith Taddy Porter', 'Samuel Smith', 'porter', 5.0, [0.38,0.35,0.12,0.72,0.05,0.68,0.4], ['chocolate','smooth','English-style']),

  // ── Stout ────────────────────────────────────────────────────────────────
  b('Guinness Draught', 'Guinness', 'stout', 4.2, [0.42,0.22,0.08,0.85,0.05,0.75,0.38], ['roasty','creamy','dry'], 'Ireland\'s iconic dry stout — smooth and roasty.'),
  b('Murphy\'s Irish Stout', 'Murphy\'s', 'stout', 4.0, [0.38,0.2,0.08,0.82,0.05,0.72,0.35], ['smooth','roasty','mild']),
  b('Left Hand Milk Stout', 'Left Hand Brewing', 'stout', 6.0, [0.35,0.45,0.08,0.82,0.05,0.78,0.38], ['chocolate','creamy','sweet-roast'], 'Sweet milk stout with a silky body.'),
  b('Samuel Smith Oatmeal Stout', 'Samuel Smith', 'stout', 5.0, [0.38,0.4,0.08,0.85,0.05,0.8,0.42], ['oatmeal','smooth','chocolate']),
  b('Founders Imperial Stout', 'Founders Brewing', 'stout', 10.5, [0.55,0.4,0.05,0.92,0.05,0.88,0.72], ['intense','dark-chocolate','espresso'], 'Russian imperial stout — massive and complex.'),
  b('Goose Island Bourbon County Stout', 'Goose Island', 'stout', 14.7, [0.45,0.5,0.05,0.95,0.05,0.92,0.85], ['bourbon','vanilla','dark-fruit'], 'Barrel-aged imperial stout — rich and legendary.'),
  b('Oskar Blues Ten FIDY', 'Oskar Blues', 'stout', 10.5, [0.55,0.42,0.05,0.92,0.05,0.88,0.78], ['coffee','chocolate','massive']),
  b('Ninkasi Oatis Oatmeal Stout', 'Ninkasi Brewing', 'stout', 7.2, [0.38,0.42,0.08,0.82,0.05,0.78,0.4], ['smooth','oatmeal','chocolate']),
  b('Young\'s Double Chocolate Stout', 'Young\'s', 'stout', 5.2, [0.35,0.55,0.08,0.88,0.05,0.82,0.45], ['chocolate','sweet','dark'], 'Brewed with real chocolate — dessert in a glass.'),
  b('Beamish Irish Stout', 'Beamish & Crawford', 'stout', 4.1, [0.38,0.2,0.08,0.8,0.05,0.72,0.32], ['roasty','dry','mild']),

  // ── Sour / Tart ──────────────────────────────────────────────────────────
  b('Lindemans Framboise', 'Lindemans', 'sour', 2.5, [0.05,0.55,0.75,0.0,0.82,0.3,0.65], ['raspberry','sweet-sour','fruit'], 'Belgian raspberry lambic — fizzy, fruity, tart.'),
  b('Lindemans Kriek', 'Lindemans', 'sour', 3.5, [0.05,0.5,0.7,0.0,0.78,0.28,0.62], ['cherry','tart','fruity']),
  b('New Belgium La Folie', 'New Belgium', 'sour', 7.0, [0.15,0.2,0.55,0.05,0.85,0.35,0.78], ['sour','oak','complex'], 'Flemish red — complex, vinegar-edged, boldly sour.'),
  b('Dogfish Head SeaQuench Ale', 'Dogfish Head', 'sour', 4.9, [0.12,0.25,0.45,0.0,0.75,0.3,0.65], ['lime','sea-salt','tart','session-sour']),
  b('Rodenbach Grand Cru', 'Rodenbach', 'sour', 6.0, [0.18,0.2,0.45,0.05,0.82,0.38,0.78], ['oak','tart','complex','Flemish-red']),
  b('Cantillon Gueuze', 'Cantillon', 'sour', 5.0, [0.1,0.08,0.35,0.0,0.92,0.3,0.88], ['funky','dry','wild'], 'Spontaneously fermented Brussels gueuze — the real deal.'),
  b('Boulevard Hibiscus Gose', 'Boulevard Brewing', 'sour', 4.2, [0.08,0.25,0.55,0.0,0.75,0.28,0.65], ['hibiscus','tart','floral','salt']),
  b('Anderson Valley Blood Orange Gose', 'Anderson Valley', 'sour', 4.2, [0.08,0.28,0.6,0.0,0.72,0.28,0.62], ['citrus','tart','refreshing','salt']),
  b('Westbrook Gose', 'Westbrook Brewing', 'sour', 4.0, [0.08,0.22,0.45,0.0,0.72,0.28,0.62], ['salt','tart','light','crisp']),
  b('Allagash Coolship Resurgam', 'Allagash Brewing', 'sour', 6.1, [0.08,0.1,0.4,0.0,0.88,0.32,0.85], ['wild','funky','complex'], 'Spontaneously fermented — unique every batch.'),

  // ── Saison ───────────────────────────────────────────────────────────────
  b('Saison Dupont', 'Brasserie Dupont', 'saison', 6.5, [0.3,0.18,0.45,0.05,0.22,0.4,0.58], ['spicy','dry','fruity'], 'The benchmark Belgian farmhouse ale.'),
  b('Boulevard Tank 7', 'Boulevard Brewing', 'saison', 8.5, [0.32,0.2,0.5,0.05,0.2,0.42,0.6], ['fruity','spicy','complex']),
  b('Ommegang Hennepin', 'Brewery Ommegang', 'saison', 7.7, [0.28,0.25,0.48,0.05,0.22,0.42,0.58], ['spiced','dry','Belgian-style']),
  b('De Ranke XX Bitter', 'De Ranke', 'saison', 6.2, [0.45,0.12,0.35,0.05,0.15,0.4,0.55], ['bitter','dry','hop-forward']),
  b('Allagash Saison', 'Allagash Brewing', 'saison', 6.1, [0.28,0.18,0.42,0.05,0.2,0.4,0.55], ['floral','dry','earthy']),

  // ── Dunkel / Vienna ──────────────────────────────────────────────────────
  b('Ayinger Altbairisch Dunkel', 'Ayinger', 'dunkel', 5.0, [0.25,0.42,0.1,0.52,0.0,0.55,0.3], ['malty','chocolate','Munich-dark']),
  b('Paulaner Münchner Dunkel', 'Paulaner', 'dunkel', 4.9, [0.25,0.4,0.1,0.5,0.0,0.52,0.28], ['toasty','malty','smooth']),
  b('Negra Modelo', 'Grupo Modelo', 'dunkel', 5.4, [0.28,0.38,0.1,0.45,0.0,0.5,0.28], ['caramel','malty','smooth'], 'Munich-style dark lager with caramel notes.'),
  b('Hacker-Pschorr Münchner Dunkel', 'Hacker-Pschorr', 'dunkel', 5.0, [0.25,0.42,0.1,0.5,0.0,0.55,0.3], ['malty','bready','classic']),
  b('Modelo Negra', 'Grupo Modelo', 'vienna_lager', 5.4, [0.28,0.4,0.1,0.42,0.0,0.52,0.28], ['caramel','smooth','dark-lager']),
]

export function beerSeedToDbRow(beer: BeerSeed) {
  return {
    name: beer.name,
    brewery: beer.brewery,
    style: beer.style,
    abv: beer.abv,
    description: beer.description,
    flavorVector: beer.fv,
    styleTags: beer.tags,
  }
}
