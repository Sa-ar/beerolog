/**
 * CatchCollection data (issue #331): the signed-in user's caught beers (ratings
 * with proof), newest first, from GET /me/catches. Server state via react-query.
 */
import { useQuery } from '@tanstack/react-query'
import { apiClient } from './api-client/client'

export function useCatchCollection() {
  return useQuery({
    queryKey: ['me', 'catches'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/me/catches')
      if (error || !data) throw new Error('Failed to load catches')
      return data
    },
  })
}
