import { useTranslation } from 'react-i18next'

// Accessible single-choice quiz control. Exposes the question as a named
// radiogroup and each option as a radio with programmatic checked state, so the
// selection is conveyed to assistive tech (not by color alone).
export function QuizChips<T extends string>({
  title,
  group,
  options,
  value,
  onChange,
}: {
  title: string
  group: string
  options: T[]
  value: T | null
  onChange: (v: T) => void
}) {
  const { t } = useTranslation()
  return (
    <section role="radiogroup" aria-label={title} className="mt-6">
      <h2 className="mb-2 text-lg font-semibold text-neutral-900">{title}</h2>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = value === opt
          return (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(opt)}
              className={`rounded-full px-3.5 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${
                selected
                  ? 'border-2 border-brand-600 bg-brand-50 text-brand-900'
                  : 'border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              {t(`enums.${group}.${opt}`)}
            </button>
          )
        })}
      </div>
    </section>
  )
}
