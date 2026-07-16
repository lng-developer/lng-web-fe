import { useQuery } from '@tanstack/react-query'

import { apiClient } from '@/services/axiosInstance'

export const podWorkbenchKeys = {
  all: ['pod-workbench'],
  module: (moduleId, query) => [...podWorkbenchKeys.all, moduleId, query],
  summary: (moduleId, query) => [...podWorkbenchKeys.module(moduleId, query), 'summary'],
}

export function unwrapApiData(response) {
  return response?.success && Object.hasOwn(response, 'data') ? response.data : response
}

function get(path, query) {
  return apiClient.get(path, { params: query }).then(unwrapApiData)
}

export function usePodModuleQuery(moduleConfig, query = {}, options = {}) {
  return useQuery({
    queryKey: podWorkbenchKeys.module(moduleConfig.id, query),
    queryFn: () => get(moduleConfig.primaryEndpoint, query),
    keepPreviousData: true,
    ...options,
  })
}

export function usePodModuleSummaryQuery(moduleConfig, query = {}, options = {}) {
  return useQuery({
    queryKey: podWorkbenchKeys.summary(moduleConfig.id, query),
    queryFn: () => get(moduleConfig.summaryEndpoint, query),
    enabled: Boolean(moduleConfig.summaryEndpoint),
    keepPreviousData: true,
    ...options,
  })
}
