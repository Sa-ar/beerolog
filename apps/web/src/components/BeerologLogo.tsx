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
  if (iconOnly) {
    return (
      <span className={`inline-flex items-center justify-center ${className}`} role="img" aria-label="Beerolog">
        <BeerologMark className={iconClassName} />
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center justify-center gap-2 ${className}`}>
      <BeerologMark className={`shrink-0 ${iconClassName}`} />
      <span className="text-[1.05rem] font-bold leading-none tracking-tight text-amber-950">
        Beerolog
      </span>
    </span>
  )
}
