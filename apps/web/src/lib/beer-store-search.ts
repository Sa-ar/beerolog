// ponytail: link out to Google Maps search instead of maintaining an in-app
// store/stock DB. Maps geolocates the user automatically when no area is given;
// pass an area to override. Upgrade path: swap for a Places API or curated DB
// if we ever need in-app listings.

// Build a Google Maps search URL for a beer at a venue type, optionally scoped
// to an area. `venueTerm` is the localized search word (e.g. "bottle shop").
export function beerStoreSearchUrl(
  beerName: string,
  venueTerm: string,
  area: string,
): string {
  const where = area.trim() ? ` ${area.trim()}` : ''
  // Collapse any internal/leading/trailing whitespace so segment padding
  // (e.g. a beer name with a trailing space) doesn't produce doubled %20.
  const query = `${beerName} ${venueTerm}${where}`.replace(/\s+/g, ' ').trim()
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}
