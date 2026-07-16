import { useMutation, useQueryClient } from '@tanstack/react-query'

import { materializeEndpointPath } from '@/features/api-coverage/data/backendEndpoints'
import { apiClient } from '@/services/axiosInstance'

import { apiWorkflowKeys } from './apiWorkflow.keys'
import { unwrapApiData } from './apiWorkflow.queries'

function parseJson(value) {
  if (!value?.trim()) return {}
  return JSON.parse(value)
}

async function runAction({ action, bodyText, params }) {
  const method = action.endpoint.method.toLowerCase()
  const path = materializeEndpointPath(action.endpoint, params)

  if (method === 'get' || method === 'delete') {
    return apiClient[method](path).then(unwrapApiData)
  }

  return apiClient[method](path, parseJson(bodyText)).then(unwrapApiData)
}

export function useWorkflowActionMutation(workflowId) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: runAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiWorkflowKeys.all })
      queryClient.invalidateQueries({ queryKey: ['api-workflows', workflowId] })
    },
  })
}
