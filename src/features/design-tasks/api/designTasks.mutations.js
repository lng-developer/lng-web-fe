import { useMutation, useQueryClient } from '@tanstack/react-query'

import { listingsKeys } from '@/features/listings/api/listings.keys'
import { scaleKeys } from '@/features/scale/api/scale.keys'
import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import {
  buildApproveDesignTaskPayload,
  buildAssignDesignTaskPayload,
  buildBulkCreatePsdTasksPayload,
  buildCancelDesignTaskPayload,
  buildCreateDesignTaskPayload,
  buildRejectDesignTaskPayload,
  buildSubmitDesignTaskPayload,
  mapDesignTaskDetail,
  unwrapApiData,
} from '../utils/designTasksApi'
import { designTasksKeys } from './designTasks.keys'

function invalidateDesignFlow(queryClient, taskId) {
  queryClient.invalidateQueries({ queryKey: designTasksKeys.all })
  queryClient.invalidateQueries({ queryKey: designTasksKeys.detail(taskId) })
  queryClient.invalidateQueries({ queryKey: designTasksKeys.submissions(taskId) })
  queryClient.invalidateQueries({ queryKey: listingsKeys.all })
  queryClient.invalidateQueries({ queryKey: scaleKeys.all })
}

export function useUploadMediaAssetMutation() {
  return useMutation({
    mutationFn: (file) => {
      const formData = new FormData()
      formData.append('file', file)
      return apiClient.post(ENDPOINTS.MEDIA.ASSETS, formData).then(unwrapApiData)
    },
  })
}

export function useCreateDesignTaskMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload) =>
      apiClient
        .post(ENDPOINTS.DESIGN.TASKS, buildCreateDesignTaskPayload(payload))
        .then(unwrapApiData)
        .then(mapDesignTaskDetail),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: designTasksKeys.all })
      queryClient.invalidateQueries({ queryKey: listingsKeys.all })
    },
  })
}

export function useStartDesignTaskMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, note }) =>
      apiClient
        .patch(ENDPOINTS.DESIGN.START(taskId), { note })
        .then(unwrapApiData)
        .then(mapDesignTaskDetail),
    onSuccess: (_data, variables) => invalidateDesignFlow(queryClient, variables.taskId),
  })
}

export function useAssignDesignTaskMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, assignedDesignerId, note }) =>
      apiClient
        .patch(
          ENDPOINTS.DESIGN.ASSIGN(taskId),
          buildAssignDesignTaskPayload({ assignedDesignerId, note }),
        )
        .then(unwrapApiData)
        .then(mapDesignTaskDetail),
    onSuccess: (_data, variables) => invalidateDesignFlow(queryClient, variables.taskId),
  })
}

export function useSubmitDesignTaskMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, mediaAssetId, note }) =>
      apiClient
        .patch(
          ENDPOINTS.DESIGN.SUBMIT(taskId),
          buildSubmitDesignTaskPayload({ mediaAssetId, note }),
        )
        .then(unwrapApiData)
        .then(mapDesignTaskDetail),
    onSuccess: (_data, variables) => invalidateDesignFlow(queryClient, variables.taskId),
  })
}

export function useCancelDesignTaskMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, cancelReason }) =>
      apiClient
        .patch(ENDPOINTS.DESIGN.CANCEL(taskId), buildCancelDesignTaskPayload({ cancelReason }))
        .then(unwrapApiData)
        .then(mapDesignTaskDetail),
    onSuccess: (_data, variables) => invalidateDesignFlow(queryClient, variables.taskId),
  })
}

export function useBulkCreatePsdTasksMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload) =>
      apiClient
        .post(
          ENDPOINTS.DESIGN.BULK_CREATE_PSD_FROM_LISTINGS,
          buildBulkCreatePsdTasksPayload(payload),
        )
        .then(unwrapApiData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: designTasksKeys.all })
      queryClient.invalidateQueries({ queryKey: listingsKeys.all })
      queryClient.invalidateQueries({ queryKey: scaleKeys.all })
    },
  })
}

export function useApproveDesignTaskMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, approvedAssetId, submissionId }) =>
      apiClient
        .patch(
          ENDPOINTS.DESIGN.APPROVE(taskId),
          buildApproveDesignTaskPayload({ approvedAssetId, submissionId }),
        )
        .then(unwrapApiData)
        .then(mapDesignTaskDetail),
    onSuccess: (_data, variables) => invalidateDesignFlow(queryClient, variables.taskId),
  })
}

export function useRejectDesignTaskMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, rejectReason, submissionId }) =>
      apiClient
        .patch(
          ENDPOINTS.DESIGN.REJECT(taskId),
          buildRejectDesignTaskPayload({ rejectReason, submissionId }),
        )
        .then(unwrapApiData)
        .then(mapDesignTaskDetail),
    onSuccess: (_data, variables) => invalidateDesignFlow(queryClient, variables.taskId),
  })
}

export function useDeleteDesignSubmissionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, submissionId }) =>
      apiClient
        .delete(ENDPOINTS.DESIGN.DELETE_SUBMISSION(taskId, submissionId))
        .then(unwrapApiData)
        .then(mapDesignTaskDetail),
    onSuccess: (_data, variables) => invalidateDesignFlow(queryClient, variables.taskId),
  })
}
