import { useQuery } from '@tanstack/react-query'

import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

function unwrap(response) {
  return response?.data ?? response
}

export function useHrDashboardQuery(dateKey) {
  return useQuery({
    queryKey: ['hr-dashboard', dateKey],
    queryFn: () => apiClient.get(ENDPOINTS.HR.DASHBOARD, { params: { dateKey } }).then(unwrap),
  })
}
