const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {}

export const features = {
  findNearbySearch: env.VITE_FEATURE_FIND_NEARBY_SEARCH === 'true',
} as const
