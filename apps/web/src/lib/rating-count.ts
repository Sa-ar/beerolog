import { useQuery } from '@tanstack/react-query'
import { apiClient } from './api-client/client'

export async function fetchRatingCount(): Promise<number | null> {
  const { data, error } = await apiClient.GET('/me/ratings', {
    params: { query: { page: 1, page_size: 1 } },
  })
  if (error || !data) return null
  return data.total
}

export function useRatingCount() {
  return useQuery({ queryKey: ['me', 'ratings', 'count'], queryFn: fetchRatingCount })
}
