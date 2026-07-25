/**
 * Single icon factory — all catalog SVG artwork is defined here.
 * Python mirror: beerolog_icon_service/icon_factory.py
 */

import { ICON_STYLE } from './style'
import type { CatalogIconGroup } from './types'

const S = ICON_STYLE.stroke
const W = ICON_STYLE.strokeWidth
const L = ICON_STYLE.fillLight
const M = ICON_STYLE.fillMid
const A = ICON_STYLE.flavorAccent
const V = ICON_STYLE.vibeAccent
const ABV = ICON_STYLE.abvAccent

function wrap(viewBox: string, body: string): string {
  return `<svg viewBox="${viewBox}" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${body}</svg>`
}

const ABV_GLASS = `<path d="M12 7h8l-1.5 17c0 1.3-1.1 2.3-2.5 2.3s-2.5-1-2.5-2.3L12 7z" fill="${L}" stroke="${S}" stroke-width="${W}" stroke-linejoin="round"/>`

function abvLiquid(topY: number): string {
  return `<path d="M12.5 ${topY} L11.5 26.3 L20.5 26.3 L19.5 ${topY} Z" fill="${ABV}" stroke="${S}" stroke-width="0.75" opacity="0.95"/><path d="M12.5 ${topY} Q16 ${topY - 1.5} 19.5 ${topY}" fill="${ABV}" stroke="${S}" stroke-width="0.5" opacity="0.35"/>`
}

function abvBody(level: string): string {
  if (level === 'any') {
    return `${ABV_GLASS}<path d="M11.5 16.5h9" stroke="${S}" stroke-width="1.75" stroke-linecap="round" stroke-dasharray="2.5 2"/><path d="M13.5 13.5c0-1.5 1.2-2.5 2.5-2.5s2.5 1 2.5 2.5-1.2 2.5-2.5 2.5" stroke="${S}" stroke-width="1.25" fill="none" stroke-linecap="round"/>`
  }
  const top = level === 'low' ? 21 : level === 'medium' ? 17 : level === 'high' ? 13 : 21
  return `${ABV_GLASS}${abvLiquid(top)}`
}

const FLAVOR_BODIES: Record<string, string> = {
  sour: `<path d="M16 5c-7 0-12 6-12 13 0 4 2 8 5 10 2 1 4 2 7 2s5-1 7-2c3-2 5-6 5-10 0-7-5-13-12-13z" fill="${A.sour}" stroke="${S}" stroke-width="${W}" stroke-linejoin="round"/><path d="M16 8v16M11 13l5 11M21 13l-5 11M8 16h16" stroke="${S}" stroke-width="1.5" stroke-linecap="round" opacity="0.45"/><path d="M16 5c-3-3-6-3-8-1" stroke="${A.leaf}" stroke-width="2" stroke-linecap="round" fill="none"/><path d="M16 5c3-3 6-3 8-1" stroke="${A.leaf}" stroke-width="2" stroke-linecap="round" fill="none"/>`,
  hoppy: `<path d="M16 4v4" stroke="${S}" stroke-width="${W}" stroke-linecap="round"/><path d="M10 11q6-4 12 0-6 4-12 0z" fill="${A.hoppy}" stroke="${S}" stroke-width="${W}" stroke-linejoin="round"/><path d="M8 17q8-5 16 0-8 5-16 0z" fill="${A.hoppy}" stroke="${S}" stroke-width="${W}" stroke-linejoin="round"/><path d="M9 23q7-4 14 0-7 4-14 0z" fill="${A.hoppy}" stroke="${S}" stroke-width="${W}" stroke-linejoin="round"/><circle cx="16" cy="6" r="2" fill="${A.leaf}" stroke="${S}" stroke-width="1.25"/>`,
  malty: `<path d="M16 28V11" stroke="${S}" stroke-width="${W}" stroke-linecap="round"/><ellipse cx="11" cy="10" rx="3.5" ry="6" fill="${A.malty}" stroke="${S}" stroke-width="${W}" transform="rotate(-22 11 10)"/><ellipse cx="16" cy="8" rx="3.5" ry="6.5" fill="${A.malty}" stroke="${S}" stroke-width="${W}"/><ellipse cx="21" cy="10" rx="3.5" ry="6" fill="${A.malty}" stroke="${S}" stroke-width="${W}" transform="rotate(22 21 10)"/><path d="M10 26h12" stroke="${S}" stroke-width="1.5" stroke-linecap="round" opacity="0.35"/>`,
  roasty: `<path d="M16 6c-6 0-9 5-9 11s3 11 9 11 9-5 9-11-3-11-9-11z" fill="${A.roasty}" stroke="${S}" stroke-width="${W}"/><path d="M16 8c2.5 5 2.5 15 0 20" stroke="hsl(38 40% 75%)" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.7"/><path d="M22 12c2 2 3 5 3 8" stroke="${S}" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.4"/>`,
  fruity: `<circle cx="16" cy="18" r="9" fill="${A.fruity}" stroke="${S}" stroke-width="${W}"/><path d="M16 9v5" stroke="${S}" stroke-width="${W}" stroke-linecap="round"/><path d="M16 9c4-4 8-3 9 0" fill="${A.leaf}" stroke="${S}" stroke-width="1.25"/><ellipse cx="13" cy="17" rx="2" ry="3" fill="hsl(355 60% 65%)" opacity="0.5"/>`,
  smoky: `<path d="M16 27c-5-7-3-13 0-17 2 3 2 7-1 10 2-3 3-7 2-11 3 5 5 10 3 15 1 2-1 3-4 3z" fill="${A.smoky}" stroke="${S}" stroke-width="${W}" stroke-linejoin="round"/><path d="M16 24c-2-4-1-8 1-11 1 2 1 5-1 7 1-2 2-5 1-8 1 3 2 6 0 9-1 2-2 3-1 3z" fill="hsl(48 95% 70%)" opacity="0.75"/><path d="M10 26h12" stroke="${S}" stroke-width="1.5" stroke-linecap="round" opacity="0.35"/>`,
  default: `<path d="M10 9h12v15c0 2.5-2.5 4.5-6 4.5s-6-2-6-4.5V9z" fill="${L}" stroke="${S}" stroke-width="${W}"/><path d="M10 14h12" stroke="${S}" stroke-width="1.5" opacity="0.4"/><path d="M22 11h2.5c1.5 0 2.5 1.2 2.5 2.8v4.4c0 1.6-1 2.8-2.5 2.8H22" stroke="${S}" stroke-width="${W}" fill="none"/>`,
}

const VIBE_BODIES: Record<string, string> = {
  refreshing: `<path d="M11 7h10l-2.5 19c0 2.2-2 3.5-2.5 3.5s-2.5-1.3-2.5-3.5L11 7z" fill="hsl(195 85% 94%)" stroke="${S}" stroke-width="${W}" stroke-linejoin="round"/><path d="M12 13h8" stroke="${V.refreshing}" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/><circle cx="14" cy="11" r="1.6" fill="${V.refreshing}" stroke="${S}" stroke-width="0.75"/><circle cx="18" cy="9.5" r="1.3" fill="${V.refreshing}" stroke="${S}" stroke-width="0.75"/><circle cx="17" cy="15" r="1.1" fill="${V.refreshing}" opacity="0.85"/><path d="M23 8l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" fill="${V.refreshing}" stroke="${S}" stroke-width="0.75"/>`,
  cozy: `<path d="M8 15h16v9c0 2.2-2.2 4-8 4s-8-1.8-8-4v-9z" fill="${V.cozy}" stroke="${S}" stroke-width="${W}" stroke-linejoin="round"/><path d="M8 19h16" stroke="${S}" stroke-width="1.25" opacity="0.35"/><path d="M24 17h3c1.2 0 2 1 2 2.2v3.6c0 1.2-.8 2.2-2 2.2h-3" stroke="${S}" stroke-width="${W}" fill="none"/><path d="M12 9c0 2.5-1.5 4-1.5 6M16 7c0 3-1.5 5-1.5 7M20 9c0 2.5-1.5 4-1.5 6" stroke="hsl(38 30% 70%)" stroke-width="2" stroke-linecap="round" fill="none"/><path d="M11 9c1.5-1 3-1 5 0M17 9c2-1 3.5-1 5 0" stroke="${S}" stroke-width="1.25" stroke-linecap="round" opacity="0.4"/>`,
  adventurous: `<circle cx="16" cy="16" r="9" fill="${L}" stroke="${S}" stroke-width="${W}"/><path d="M16 8l2 7H25l-6 4.5 2 7.5L16 20l-5 6.5 2-7.5-6-4.5h7z" fill="${V.adventurous}" stroke="${S}" stroke-width="${W}" stroke-linejoin="round"/><circle cx="16" cy="16" r="2" fill="${S}"/>`,
  familiar: `<path d="M5 15l11-8 11 8v11c0 1.8-1.5 3-3 3H8c-1.5 0-3-1.2-3-3V15z" fill="${V.familiar}" stroke="${S}" stroke-width="${W}" stroke-linejoin="round"/><rect x="13" y="20" width="6" height="9" rx="1" fill="${M}" stroke="${S}" stroke-width="1.25"/><rect x="11" y="17" width="4" height="3" rx="0.5" fill="hsl(48 90% 70%)" stroke="${S}" stroke-width="1"/><path d="M20 8v4" stroke="${S}" stroke-width="1.5" stroke-linecap="round" opacity="0.45"/>`,
}

const JOURNEY_BODIES: Record<string, string> = {
  quiz: `<rect x="8" y="6" width="20" height="26" rx="3" fill="${L}" stroke="${S}" stroke-width="${W}"/><path d="M12 14h12M12 19h8M12 24h10" stroke="${S}" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/><circle cx="24" cy="24" r="5" fill="${S}"/><path d="M22.5 24l1.5 1.5 3-3" stroke="white" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>`,
  vibe: `<rect x="6" y="10" width="24" height="5" rx="2.5" fill="${M}" stroke="${S}" stroke-width="1.25"/><circle cx="14" cy="12.5" r="3.5" fill="${S}"/><rect x="6" y="18" width="24" height="5" rx="2.5" fill="${M}" stroke="${S}" stroke-width="1.25"/><circle cx="22" cy="20.5" r="3.5" fill="${S}"/><rect x="6" y="26" width="24" height="5" rx="2.5" fill="${M}" stroke="${S}" stroke-width="1.25"/><circle cx="18" cy="28.5" r="3.5" fill="${S}"/>`,
  picks: `<path d="M12 8h12v16c0 2-2 3-6 3s-6-1-6-3V8z" fill="${L}" stroke="${S}" stroke-width="${W}"/><path d="M12 12h12" stroke="${S}" stroke-width="1.25" opacity="0.4"/><rect x="8" y="14" width="3.5" height="3.5" rx="0.5" fill="${S}" opacity="0.85"/><text x="9.75" y="17.2" font-size="5" fill="white" font-weight="bold">1</text><rect x="8" y="19" width="3.5" height="3.5" rx="0.5" fill="${S}" opacity="0.65"/><text x="9.75" y="22.2" font-size="5" fill="white" font-weight="bold">2</text><rect x="8" y="24" width="3.5" height="3.5" rx="0.5" fill="${S}" opacity="0.45"/><text x="9.75" y="27.2" font-size="5" fill="white" font-weight="bold">3</text>`,
}

const MARKETING_BODIES: Record<string, string> = {
  'taste-quiz-hero': `<ellipse cx="100" cy="148" rx="56" ry="8" fill="${M}"/><rect x="62" y="48" width="76" height="88" rx="10" fill="${L}" stroke="${S}" stroke-width="2" stroke-dasharray="6 4"/><path d="M62 68 Q100 58 138 68" fill="none" stroke="${S}" stroke-width="2" opacity="0.5"/><circle cx="84" cy="92" r="6" fill="${S}" opacity="0.2"/><circle cx="116" cy="102" r="5" fill="${S}" opacity="0.15"/><text x="100" y="98" text-anchor="middle" font-size="28" fill="hsl(25 50% 15%)" opacity="0.35">?</text><circle cx="148" cy="28" r="18" fill="${M}" stroke="${S}" stroke-width="2"/><path d="M144 24c2-4 6-6 8-4" fill="none" stroke="${S}" stroke-width="1.5" stroke-linecap="round"/><circle cx="36" cy="36" r="16" fill="${M}" stroke="${S}" stroke-width="2"/><rect x="31" y="32" width="10" height="8" rx="2" fill="${S}" opacity="0.25"/><circle cx="100" cy="16" r="14" fill="${S}"/><path d="M96 16l3 3 5-6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
}

// Archetype icons (slice #286): one per shareable taste archetype. The six
// flavor-led archetypes reuse the flavor artwork (maximally representative); the
// scalar-led ones get their own brand-style bodies. All are 32x32 @beerolog/icons
// SVGs — never emoji.
const ARCHETYPE_BODIES: Record<string, string> = {
  'hop-chaser': FLAVOR_BODIES.hoppy!,
  'bitter-zealot': `<path d="M16 3v4" stroke="${S}" stroke-width="${W}" stroke-linecap="round"/><path d="M9 10q7-4 14 0-7 5-14 0z" fill="${A.hoppy}" stroke="${S}" stroke-width="${W}" stroke-linejoin="round"/><path d="M7 17q9-5 18 0-9 5-18 0z" fill="${A.hoppy}" stroke="${S}" stroke-width="${W}" stroke-linejoin="round"/><path d="M9 24q7-4 14 0-7 4-14 0z" fill="${A.hoppy}" stroke="${S}" stroke-width="${W}" stroke-linejoin="round"/><path d="M13 29l3-3 3 3" stroke="${S}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  'malt-romantic': FLAVOR_BODIES.malty!,
  'roast-devotee': FLAVOR_BODIES.roasty!,
  'fruit-forward': FLAVOR_BODIES.fruity!,
  'sour-seeker': FLAVOR_BODIES.sour!,
  'smoke-wanderer': FLAVOR_BODIES.smoky!,
  adventurer: VIBE_BODIES.adventurous!,
  heavyweight: `<path d="M10 6h12l-1 20c0 2-2 3.5-5 3.5s-5-1.5-5-3.5L10 6z" fill="${A.roasty}" stroke="${S}" stroke-width="${W}" stroke-linejoin="round"/><ellipse cx="16" cy="8.5" rx="6" ry="1.8" fill="${L}" stroke="${S}" stroke-width="1"/><path d="M11.5 13h9" stroke="${L}" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/>`,
  'easy-drinker': VIBE_BODIES.refreshing!,
  'crisp-classicist': `<path d="M12 5h8l-1.5 22c0 1.5-1.2 2.5-2.5 2.5s-2.5-1-2.5-2.5L12 5z" fill="hsl(48 90% 88%)" stroke="${S}" stroke-width="${W}" stroke-linejoin="round"/><circle cx="15" cy="12" r="1.2" fill="white" stroke="${S}" stroke-width="0.6"/><circle cx="17.5" cy="16" r="1" fill="white" stroke="${S}" stroke-width="0.6"/><circle cx="15.5" cy="20" r="0.9" fill="white" stroke="${S}" stroke-width="0.6"/>`,
  'balanced-explorer': `<circle cx="16" cy="16" r="11" fill="${L}" stroke="${S}" stroke-width="${W}"/><path d="M16 5a11 11 0 0 1 0 22z" fill="${A.malty}"/><path d="M16 5v22" stroke="${S}" stroke-width="1.5"/>`,
}

const PURPOSE_MAP: Record<string, { viewBox: string; body: string }> = {}

function registerPurpose(purpose: string, viewBox: string, body: string) {
  PURPOSE_MAP[purpose] = { viewBox, body }
}

for (const [key, body] of Object.entries(FLAVOR_BODIES)) {
  if (key !== 'default') registerPurpose(`taste-profile:flavor:${key}`, '0 0 32 32', body)
}
for (const [key, body] of Object.entries(VIBE_BODIES)) {
  registerPurpose(`session:vibe:${key}`, '0 0 32 32', body)
}
for (const level of ['low', 'medium', 'high', 'any'] as const) {
  registerPurpose(`session:abv:${level}`, '0 0 32 32', abvBody(level))
}
for (const [key, body] of Object.entries(JOURNEY_BODIES)) {
  registerPurpose(`journey:${key}`, '0 0 36 36', body)
}
for (const [key, body] of Object.entries(MARKETING_BODIES)) {
  registerPurpose(`marketing:${key}`, '0 0 200 160', body)
}
for (const [key, body] of Object.entries(ARCHETYPE_BODIES)) {
  registerPurpose(`archetype:${key}`, '0 0 32 32', body)
}

function flavorBody(key: string): string {
  return FLAVOR_BODIES[key] ?? FLAVOR_BODIES['default']!
}

function buildHeroCompositeBody(primary: string, secondary: string): string {
  const clipId = `hero-clip-${primary}-${secondary}`
  return `<g transform="translate(16 16) scale(0.85) translate(-16 -16)">${flavorBody(primary)}</g><g transform="translate(24 24)"><circle cx="0" cy="0" r="7.5" fill="${L}" stroke="${S}" stroke-width="1.5"/><clipPath id="${clipId}"><circle cx="0" cy="0" r="6.5"/></clipPath><g clip-path="url(#${clipId})"><g transform="scale(0.5) translate(-16 -16)">${flavorBody(secondary)}</g></g></g>`
}

export function buildHeroSvg(keys: string[]): string | null {
  const [primary, secondary] = keys
  if (!primary) return null
  if (!secondary) {
    return wrap('0 0 32 32', flavorBody(primary))
  }
  return wrap('0 0 32 32', buildHeroCompositeBody(primary, secondary))
}

export function buildIconByPurpose(purpose: string): string | null {
  const entry = PURPOSE_MAP[purpose]
  if (entry) return wrap(entry.viewBox, entry.body)

  if (purpose.startsWith('taste-profile:hero:')) {
    const keys = purpose.replace('taste-profile:hero:', '').split('+')
    return buildHeroSvg(keys)
  }
  return null
}

export function buildCatalogSvg(group: CatalogIconGroup, iconKey: string): string | null {
  switch (group) {
    case 'session.vibe': {
      const body = VIBE_BODIES[iconKey]
      return body ? wrap('0 0 32 32', body) : null
    }
    case 'session.abv':
      return wrap('0 0 32 32', abvBody(iconKey))
    case 'journey': {
      const body = JOURNEY_BODIES[iconKey]
      return body ? wrap('0 0 36 36', body) : null
    }
    case 'flavor':
      return wrap('0 0 32 32', FLAVOR_BODIES[iconKey] ?? FLAVOR_BODIES['default']!)
    case 'marketing': {
      const body = MARKETING_BODIES[iconKey]
      return body ? wrap('0 0 200 160', body) : null
    }
    default:
      return null
  }
}

export function buildFlavorSvg(flavor: string): string | null {
  return buildCatalogSvg('flavor', flavor)
}

export function buildArchetypeSvg(key: string): string | null {
  return buildIconByPurpose(`archetype:${key}`)
}
