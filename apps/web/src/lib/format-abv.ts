/**
 * Format a beer's ABV as a compact percentage string (one decimal, trailing
 * zeros dropped). Shared by every card that shows an ABV pill so the display
 * stays identical across surfaces.
 */
export function formatAbv(abv: number): string {
  return `${Number(abv.toFixed(1))}%`
}
