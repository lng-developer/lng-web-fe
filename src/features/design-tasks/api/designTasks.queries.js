import { useQuery } from '@tanstack/react-query'

import {
  buildDesignTaskQuery,
  mapBackendDesignTasksResponse,
  mapDesignAssignees,
  mapDesignSubmissionsResponse,
  mapDesignTaskDetail,
  mapDesignWorkload,
  mapPsdTemplateCandidatesResponse,
  unwrapApiData,
} from '@/features/design-tasks/utils/designTasksApi'
import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import { designTasksKeys } from './designTasks.keys'

export function useDesignTasksQuery(query = {}, options = {}) {
  return useQuery({
    queryKey: designTasksKeys.list(query),
    queryFn: () =>
      apiClient
        .get(ENDPOINTS.DESIGN.TASKS, { params: buildDesignTaskQuery(query) })
        .then(unwrapApiData)
        .then((response) => mapBackendDesignTasksResponse(response, query)),
    ...options,
  })
}

export function useDesignTaskDetailQuery(taskId, options = {}) {
  return useQuery({
    queryKey: designTasksKeys.detail(taskId),
    queryFn: () =>
      apiClient.get(ENDPOINTS.DESIGN.TASK(taskId)).then(unwrapApiData).then(mapDesignTaskDetail),
    enabled: Boolean(taskId),
    ...options,
  })
}

export function useDesignTaskSummaryQuery(query = {}, options = {}) {
  const params = buildDesignTaskQuery(query)
  delete params.page
  delete params.limit

  return useQuery({
    queryKey: designTasksKeys.summary(params),
    queryFn: () => apiClient.get(ENDPOINTS.DESIGN.SUMMARY, { params }).then(unwrapApiData),
    ...options,
  })
}

export function useDesignWorkloadQuery(query = {}, options = {}) {
  const params = buildDesignTaskQuery(query)
  delete params.page
  delete params.limit

  return useQuery({
    queryKey: designTasksKeys.workload(params),
    queryFn: () =>
      apiClient
        .get(ENDPOINTS.DESIGN.WORKLOAD, { params })
        .then(unwrapApiData)
        .then(mapDesignWorkload),
    ...options,
  })
}

export function useDesignTaskSubmissionsQuery(taskId, options = {}) {
  return useQuery({
    queryKey: designTasksKeys.submissions(taskId),
    queryFn: () =>
      apiClient
        .get(ENDPOINTS.DESIGN.SUBMISSIONS(taskId))
        .then(unwrapApiData)
        .then(mapDesignSubmissionsResponse),
    enabled: Boolean(taskId),
    ...options,
  })
}

export function useDesignAssigneesQuery(query = {}, options = {}) {
  return useQuery({
    queryKey: [...designTasksKeys.all, 'assignees', query],
    queryFn: () =>
      apiClient
        .get(ENDPOINTS.DESIGN.ASSIGNEES, { params: query })
        .then(unwrapApiData)
        .then(mapDesignAssignees),
    staleTime: 5 * 60 * 1000,
    ...options,
  })
}

export function usePsdTemplateCandidatesQuery(query = {}, options = {}) {
  return useQuery({
    queryKey: [...designTasksKeys.all, 'psd-candidates', query],
    queryFn: () =>
      apiClient
        .get(ENDPOINTS.DESIGN.PSD_TEMPLATE_CANDIDATES, { params: query })
        .then(unwrapApiData)
        .then(mapPsdTemplateCandidatesResponse),
    ...options,
  })
}
