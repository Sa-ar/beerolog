// ponytail: link out to Google Maps for a specific known venue instead of
// maintaining an in-app store/stock DB. Upgrade path: swap for a Places API or
// curated DB if we ever need in-app listings.

// Maps link for a specific known venue ("take me to this exact place").
export function venueMapsUrl(parts: {
  name: string
  address?: string | null
  city?: string | null
}): string {
  const query = [parts.name, parts.address, parts.city].filter(Boolean).join(' ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}
