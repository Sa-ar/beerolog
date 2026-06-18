const UNSAFE_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /\bon\w+\s*=/i,
]

export function sanitizeSvg(svg: string): string {
  const trimmed = svg.trim()
  if (!trimmed.toLowerCase().includes('<svg')) {
    throw new Error('SVG must contain a root <svg> element')
  }
  for (const pattern of UNSAFE_PATTERNS) {
    if (pattern.test(trimmed)) {
      throw new Error('Unsafe SVG content')
    }
  }
  return trimmed
}
