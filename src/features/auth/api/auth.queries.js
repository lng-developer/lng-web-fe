import { useQuery } from '@tanstack/react-query'

import { apiClient, ensureAccessToken } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import { authKeys } from './auth.keys'

function fetchCurrentUser() {
  return apiClient.get(ENDPOINTS.AUTH.ME)
}

export function useCurrentUserQuery() {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: fetchCurrentUser,
export function useCurrentUserQuery(options = {}) {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: async () => {
      await ensureAccessToken()
      return apiClient.get(ENDPOINTS.AUTH.ME)
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    ...options,
  })
}
