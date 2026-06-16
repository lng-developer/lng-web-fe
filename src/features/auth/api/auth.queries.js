import { useQuery } from '@tanstack/react-query'

import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import { authKeys } from './auth.keys'

function fetchCurrentUser() {
  return apiClient.get(ENDPOINTS.AUTH.ME)
}

export function useCurrentUserQuery() {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: fetchCurrentUser,
  })
}
