import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import { financeKeys } from './finance.keys'

function unwrapApiData(response) {
  return response?.success && Object.hasOwn(response, 'data') ? response.data : response
}

export function useFinanceSnapshotsQuery(query = {}, options = {}) {
  return useQuery({
    queryKey: financeKeys.snapshots(query),
    queryFn: () =>
      apiClient.get(ENDPOINTS.FINANCE.SNAPSHOTS, { params: query }).then(unwrapApiData),
    placeholderData: keepPreviousData,
    ...options,
  })
}
