import { useQuery } from '@tanstack/react-query'

import { materializeEndpointPath } from '@/features/api-coverage/data/backendEndpoints'
import { apiClient } from '@/services/axiosInstance'

import { apiWorkflowKeys } from './apiWorkflow.keys'

export function unwrapApiData(response) {
  return response?.success && Object.hasOwn(response, 'data') ? response.data : response
}

function get(endpoint, params = {}, query = {}) {
  return apiClient
    .get(materializeEndpointPath(endpoint, params), { params: query })
    .then(unwrapApiData)
}

export function useWorkflowListQuery(workflowId, tab, query = {}, options = {}) {
  return useQuery({
    ...options,
    queryKey: apiWorkflowKeys.list(workflowId, tab?.id, query),
    queryFn: () => get(tab.listEndpoint, {}, query),
    enabled: Boolean(tab?.listEndpoint) && options.enabled !== false,
    keepPreviousData: true,
  })
}

export function useWorkflowDetailQuery(workflowId, endpoint, params = {}, options = {}) {
  return useQuery({
    queryKey: apiWorkflowKeys.detail(workflowId, endpoint?.id, params),
    queryFn: () => get(endpoint, params),
    enabled: Boolean(endpoint) && endpoint.paramNames.every((name) => params[name]),
    ...options,
  })
}
