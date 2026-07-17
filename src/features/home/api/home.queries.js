import { useQuery } from '@tanstack/react-query'

import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import { homeKeys } from './home.keys.js'
import { mapHomeSummaryResponse } from './homeSummary.js'

function unwrapApiData(response) {
  return response?.success && Object.hasOwn(response, 'data') ? response.data : response
}

function fetchHomeSummary() {
  return apiClient
    .get(ENDPOINTS.REPORTS.OPERATIONS_OVERVIEW)
    .then(unwrapApiData)
    .then(mapHomeSummaryResponse)
}

export function useHomeSummaryQuery() {
  return useQuery({
    queryKey: homeKeys.summary(),
    queryFn: fetchHomeSummary,
  })
}
