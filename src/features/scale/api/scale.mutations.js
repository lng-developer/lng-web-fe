import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import { unwrapApiData } from '../utils/scaleApi'
import { scaleKeys } from './scale.keys'

function invalidateScale(queryClient) {
  queryClient.invalidateQueries({ queryKey: scaleKeys.all })
}

function patch(path, payload) {
  return apiClient.patch(path, payload).then(unwrapApiData)
}

export function useAssignScaleTaskMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, assignedDesignUserId }) =>
      patch(ENDPOINTS.SCALE.ASSIGN(taskId), { assignedDesignUserId }),
    onSuccess: () => invalidateScale(queryClient),
  })
}

export function useAssignCsTaskMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, csAssigneeId }) =>
      patch(ENDPOINTS.SCALE.ASSIGN_CS(taskId), { csAssigneeId: csAssigneeId || null }),
    onSuccess: () => invalidateScale(queryClient),
  })
}

export function useClaimScaleTaskMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId }) => patch(ENDPOINTS.SCALE.CLAIM(taskId)),
    onSuccess: () => invalidateScale(queryClient),
  })
}

export function useUpdateScaleTaskNoteMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, designNote }) =>
      patch(ENDPOINTS.SCALE.DESIGN_NOTE(taskId), { designNote }),
    onSuccess: () => invalidateScale(queryClient),
  })
}

export function useUpdateScaleTaskCsNoteMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, csNote }) => patch(ENDPOINTS.SCALE.CS_NOTE(taskId), { csNote }),
    onSuccess: () => invalidateScale(queryClient),
  })
}

export function useUploadScaleOutputMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ taskId, fileCheckId, file }) => {
      const formData = new FormData()
      formData.append('file', file)
      return apiClient
        .post(ENDPOINTS.SCALE.SCALED_OUTPUT_FILE(taskId, fileCheckId), formData)
        .then(unwrapApiData)
    },
    onSuccess: () => invalidateScale(queryClient),
  })
}

export function useDownloadScaleAssetMutation() {
  return useMutation({
    mutationFn: (assetId) =>
      apiClient.get(ENDPOINTS.MEDIA.ASSET_DOWNLOAD(assetId), { responseType: 'blob' }),
  })
}
