import { Heading } from '@beerolog/ui'
import { useTranslation } from 'react-i18next'
import { QuizIcon } from './quiz-icons'

// Grid columns tuned to the option count so a 3-option scale sits on one row
// instead of leaving an orphaned card in a 2-column grid.
export function optionGrid(n: number): string {
  if (n <= 1) return 'grid-cols-1'
  if (n === 3) return 'grid-cols-3'
  if (n === 2 || n === 4) return 'grid-cols-2'
  return 'grid-cols-2 sm:grid-cols-3'
}

const CARD =
  'group relative flex min-h-20 cursor-pointer items-center justify-center rounded-xl border-2 p-4 text-center font-display text-lg uppercase tracking-wide transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-500'
const CARD_ON = 'border-brand-300 bg-brand-300 font-semibold text-[hsl(26_30%_10%)]'
const CARD_OFF =
  'border-neutral-300 bg-neutral-100/40 text-neutral-900 hover:border-brand-300 hover:bg-neutral-100'

// Shared card styling for radio (single) and checkbox (multi) option cards.
export const optionCardClass = (selected: boolean) => `${CARD} ${selected ? CARD_ON : CARD_OFF}`

// Hand-drawn chalk tick that strokes itself on when an option is selected.
export function ChalkTick() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="pointer-events-none absolute end-2 top-2 h-4 w-4 text-[hsl(26_30%_10%)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d="M4 12 l5 5 L20 5"
        className="[stroke-dasharray:30] [stroke-dashoffset:30] animate-[chalkDraw_220ms_ease-out_forwards]"
      />
    </svg>
  )
}

// Accessible single-choice control: a native radio group (one tab stop, arrow
// keys move + select) styled as cards. `onChange` fires for keyboard and
// pointer; `onPointerPick` fires only on pointer/tap, so callers can gate
// auto-advance to pointer use and leave keyboard users an explicit Next.
export function QuizChips<T extends string>({
  title,
  subtitle,
  group,
  options,
  value,
  onChange,
  onPointerPick,
}: {
  title: string
  // Optional "why we ask" rationale shown under the prompt.
  subtitle?: string | undefined
  group: string
  options: T[]
  value: T | null
  onChange: (v: T) => void
  onPointerPick?: ((v: T) => void) | undefined
}) {
  const { t } = useTranslation()
  return (
    <div role="radiogroup" aria-label={title} data-testid="quiz-question" className="mt-6">
      <Heading level={2} className={`${subtitle ? 'mb-1' : 'mb-3'} font-display text-xl font-semibold uppercase tracking-wide text-neutral-900`}>
        {title}
      </Heading>
      {subtitle ? (
        <p className="mb-3 text-sm font-normal normal-case tracking-normal text-neutral-500">
          {subtitle}
        </p>
      ) : null}
      <div className={`grid gap-3 ${optionGrid(options.length)}`}>
        {options.map((opt) => {
          const selected = value === opt
          return (
            // The label wraps a native radio that owns keyboard selection; this
            // onClick only gates pointer-driven auto-advance (keyboard must NOT
            // advance), so the a11y listener rules don't apply here.
            // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events
            <label
              key={opt}
              className={optionCardClass(selected)}
              // Auto-advance on real pointer clicks only. A keyboard arrow that
              // changes the radio also fires `click`, but with detail 0; real
              // taps/clicks have detail >= 1. Committing here (on the current
              // card) also avoids the pointerup -> remount -> trailing-click race.
              onClick={(e) => {
                if (onPointerPick && e.detail > 0) onPointerPick(opt)
              }}
            >
              <input
                type="radio"
                name={group}
                value={opt}
                checked={selected}
                data-value={opt}
                onChange={() => onChange(opt)}
                className="sr-only"
              />
              <span className="flex flex-col items-center gap-1.5">
                <QuizIcon group={group} option={opt} className="h-7 w-7" />
                <span>{t(`enums.${group}.${opt}`)}</span>
              </span>
              {selected ? <ChalkTick /> : null}
            </label>
          )
        })}
      </div>
    </div>
  )
}
