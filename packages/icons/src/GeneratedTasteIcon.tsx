import { sanitizeSvg } from './sanitize'

type GeneratedTasteIconProps = {
  svg: string
  className?: string
}

/** Strip embedded sizing classes; the wrapper controls layout and padding. */
function prepareSvgMarkup(svg: string): string {
  const safe = sanitizeSvg(svg)
  return safe.replace(/<svg\b([^>]*)>/i, (_match, attrs: string) => {
    const cleaned = attrs.replace(/\sclass="[^"]*"/gi, '')
    return `<svg${cleaned} class="h-full w-full" preserveAspectRatio="xMidYMid meet">`
  })
}

export function GeneratedTasteIcon({ svg, className }: GeneratedTasteIconProps) {
  let markup: string
  try {
    markup = prepareSvgMarkup(svg)
  } catch {
    return null
  }

  const wrapperClass = ['inline-flex shrink-0 items-center justify-center p-1', className]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={wrapperClass} aria-hidden dangerouslySetInnerHTML={{ __html: markup }} />
  )
}
