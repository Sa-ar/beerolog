import { useTranslation } from 'react-i18next'
import { BeerologMark } from './illustrations/beerolog-icons'

type BeerologLogoProps = {
  className?: string
  /** Icon size class. Defaults to h-7 w-7 (28px). */
  iconClassName?: string
  /** When true, renders icon only. */
  iconOnly?: boolean
}

export function BeerologLogo({
  className = '',
  iconClassName = 'h-7 w-7',
  iconOnly = false,
}: BeerologLogoProps) {
  const { t } = useTranslation()
  const title = t('appTitle')

  if (iconOnly) {
    return (
      <span className={`inline-flex items-center justify-center ${className}`} role="img" aria-label={title}>
        <BeerologMark className={iconClassName} />
      </span>
    )
  }

  return (
    <span className={`inline-flex min-w-0 items-center justify-center gap-2 ${className}`}>
      <BeerologMark className={`shrink-0 ${iconClassName}`} />
      <span className="max-w-[9rem] truncate font-script text-2xl leading-none tracking-tight text-brand-300 sm:max-w-none">
        {title}
      </span>
    </span>
  )
}
