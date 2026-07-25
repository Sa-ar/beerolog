import { GeneratedTasteIcon } from '@beerolog/icons'
import { Heading } from '@beerolog/ui'
import { useTranslation } from 'react-i18next'
import {
  ARCHETYPE_RADAR_AXES,
  ARCHETYPES,
  archetypeAxisKey,
  archetypeNameKey,
  archetypeTaglineKey,
  archetypeTraitsKey,
  type ArchetypeKey,
} from '../lib/archetypes'
import { dirFor, normalizeLang } from '../i18n/locale-cookie'
import type { RadarAxis } from '../lib/taste-radar'
import { TasteRadar } from './TasteRadar'

// Card layout variants, modeled as a const object (frontend-conventions enum);
// the type derives from it and per-variant styling is an object lookup.
export const ARCHETYPE_CARD_VARIANTS = { reveal: 'reveal', share: 'share' } as const
export type ArchetypeCardVariant =
  (typeof ARCHETYPE_CARD_VARIANTS)[keyof typeof ARCHETYPE_CARD_VARIANTS]

const CARD_LAYOUT: Record<ArchetypeCardVariant, string> = {
  reveal: 'rounded-3xl border border-brand-700/40 px-6 py-8 shadow-md',
  share: 'aspect-[9/16] w-full max-w-[420px] justify-center px-8 py-12',
}
const ICON_SIZE: Record<ArchetypeCardVariant, string> = { reveal: 'h-16 w-16', share: 'h-24 w-24' }
const NAME_SIZE: Record<ArchetypeCardVariant, string> = { reveal: 'text-3xl', share: 'text-4xl' }
const RADAR_WIDTH: Record<ArchetypeCardVariant, string> = {
  reveal: 'w-full max-w-[16rem]',
  share: 'w-64',
}

// Presentational archetype card, brand chalkboard styling (espresso/cream/gold,
// Oswald display). Copy comes from i18n in the active UI language; text
// direction / casing derive from the shared language util. `variant` selects the
// layout (in-app reveal vs full-bleed 9:16 share).
type ArchetypeCardProps = {
  archetypeKey: ArchetypeKey
  variant: ArchetypeCardVariant
}

export function ArchetypeCard({ archetypeKey, variant }: ArchetypeCardProps) {
  const { t, i18n } = useTranslation()
  const lang = normalizeLang(i18n.language)
  const dir = dirFor(lang)
  const meta = ARCHETYPES[archetypeKey]
  const name = t(archetypeNameKey(archetypeKey))
  const tagline = t(archetypeTaglineKey(archetypeKey))
  const traits = t(archetypeTraitsKey(archetypeKey), { returnObjects: true }) as string[]

  const axes: RadarAxis[] = ARCHETYPE_RADAR_AXES.map((key) => ({ key, value: meta.radar[key] }))
  const labels: Record<string, string> = Object.fromEntries(
    ARCHETYPE_RADAR_AXES.map((axis) => [axis, t(archetypeAxisKey(axis))]),
  )

  return (
    <div
      data-testid="archetype-card"
      data-variant={variant}
      dir={dir}
      className={[
        'flex flex-col items-center gap-5 bg-[hsl(26_24%_9%)] text-neutral-900',
        CARD_LAYOUT[variant],
      ].join(' ')}
    >
      <p className="font-script text-lg text-brand-300">Beerolog</p>

      <span
        className="flex items-center justify-center rounded-2xl bg-neutral-100 p-3 shadow-sm ring-1 ring-brand-700/40"
        aria-hidden
      >
        <GeneratedTasteIcon svg={meta.icon} className={ICON_SIZE[variant]} />
      </span>

      <div className="space-y-2 text-center">
        <Heading
          level={2}
          data-testid="archetype-name"
          // Latin display type is uppercased (Oswald); RTL (Hebrew) never is.
          className={['font-display', NAME_SIZE[variant], dir === 'rtl' ? '' : 'uppercase'].join(' ')}
        >
          {name}
        </Heading>
        <p className="mx-auto max-w-[26ch] text-base text-neutral-600">{tagline}</p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {traits.map((trait) => (
          <span
            key={trait}
            className="rounded-full border border-brand-700/40 bg-neutral-100/10 px-3 py-1 text-sm font-semibold text-brand-200"
          >
            {trait}
          </span>
        ))}
      </div>

      <div className={RADAR_WIDTH[variant]}>
        <TasteRadar axes={axes} labels={labels} ariaLabel={name} />
      </div>
    </div>
  )
}
