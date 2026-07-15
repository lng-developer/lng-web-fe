import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import { productionKeys } from './production.keys'
import { normalizeBulkPushResult } from './productionApi'

function unwrapApiData(response) {
  return response?.success && Object.hasOwn(response, 'data') ? response.data : response
}

function invalidateProduction(queryClient) {
  queryClient.invalidateQueries({ queryKey: productionKeys.all })
}

export function useSubmitProductionQcMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, decision, note }) =>
      apiClient
        .patch(ENDPOINTS.PRODUCTION.QC(taskId), { decision, note: note || null })
        .then(unwrapApiData),
    onSuccess: () => invalidateProduction(queryClient),
  })
}

export function usePushProductionTasksMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskIds }) =>
      apiClient
        .post(ENDPOINTS.PRODUCTION.BULK_PUSH_VENDOR, { taskIds })
        .then(unwrapApiData)
        .then(normalizeBulkPushResult),
    onSuccess: () => invalidateProduction(queryClient),
  })
}

export function useExportProductionQcTasksMutation() {
  return useMutation({
    mutationFn: (query) =>
      apiClient.get(ENDPOINTS.PRODUCTION.QC_EXPORT, {
        params: query,
        responseType: 'blob',
      }),
  })
}
