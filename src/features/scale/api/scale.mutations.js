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

export function useUploadScaleOutputMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ taskId, fileCheckId, file }) => {
      const formData = new FormData()
      formData.append('file', file)
      const asset = await apiClient
        .post(ENDPOINTS.MEDIA.ASSETS, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then(unwrapApiData)

      return patch(ENDPOINTS.SCALE.SCALED_OUTPUT(taskId, fileCheckId), {
        mediaAssetId: asset.id,
      })
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
