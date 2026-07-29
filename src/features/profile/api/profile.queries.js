import { useQuery } from '@tanstack/react-query'

import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import { profileKeys } from './profile.keys'

export function unwrapProfileResponse(response) {
  return response?.success && Object.hasOwn(response, 'data') ? response.data : response
}

export function useMyEmployeeProfileQuery(options = {}) {
  return useQuery({
    queryKey: profileKeys.me(),
    queryFn: () => apiClient.get(ENDPOINTS.HR.MY_EMPLOYEE_PROFILE).then(unwrapProfileResponse),
    ...options,
  })
}
