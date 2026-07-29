import { useQuery } from '@tanstack/react-query'

import { apiClient, ensureAccessToken } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import { authKeys } from './auth.keys'

export async function fetchCurrentUser() {
  await ensureAccessToken()

  return apiClient.get(ENDPOINTS.AUTH.ME)
}

export function useCurrentUserQuery(options = {}) {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 5 * 60 * 1000,
    ...options,
  })
}
