import { useMutation, useQueryClient } from '@tanstack/react-query'

import { ordersKeys } from '@/features/orders/api/orders.keys'
import { productionKeys } from '@/features/production/api/production.keys'
import { scaleKeys } from '@/features/scale/api/scale.keys'
import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import {
  buildCancelVendorSubmissionPayload,
  buildCreateVendorSubmissionQuery,
  buildMarkFailedVendorSubmissionPayload,
  buildRetryVendorSubmissionPayload,
  buildSubmitToVendorPayload,
  unwrapApiData,
} from '../utils/vendorSubmissionsApi'
import { vendorSubmissionsKeys } from './vendorSubmissions.keys'

function invalidateVendorSubmissionFlow(queryClient) {
  queryClient.invalidateQueries({ queryKey: vendorSubmissionsKeys.all })
  queryClient.invalidateQueries({ queryKey: ['shipments'] })
  queryClient.invalidateQueries({ queryKey: productionKeys.all })
  queryClient.invalidateQueries({ queryKey: scaleKeys.all })
  queryClient.invalidateQueries({ queryKey: ordersKeys.all })
}

function post(path, payload, config) {
  return apiClient.post(path, payload, config).then(unwrapApiData)
}

export function useCreateVendorSubmissionFromProductionTaskMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (productionTaskId) =>
      post(ENDPOINTS.VENDOR_SUBMISSIONS.FROM_PRODUCTION_TASK(productionTaskId)),
    onSuccess: () => invalidateVendorSubmissionFlow(queryClient),
  })
}

export function useRecheckVendorSubmissionProductionTaskMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (productionTaskId) =>
      post(ENDPOINTS.VENDOR_SUBMISSIONS.RECHECK_PRODUCTION_TASK(productionTaskId)),
    onSuccess: () => invalidateVendorSubmissionFlow(queryClient),
  })
}

export function useRecheckReadyVendorSubmissionsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (query = {}) =>
      post(ENDPOINTS.VENDOR_SUBMISSIONS.RECHECK_READY, null, {
        params: buildCreateVendorSubmissionQuery(query),
      }),
    onSuccess: () => invalidateVendorSubmissionFlow(queryClient),
  })
}

export function useSubmitToVendorMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...payload }) =>
      post(ENDPOINTS.VENDOR_SUBMISSIONS.SUBMIT_TO_VENDOR(id), buildSubmitToVendorPayload(payload)),
    onSuccess: () => invalidateVendorSubmissionFlow(queryClient),
  })
}

export function useMarkSubmittedVendorSubmissionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id) => post(ENDPOINTS.VENDOR_SUBMISSIONS.MARK_SUBMITTED(id)),
    onSuccess: () => invalidateVendorSubmissionFlow(queryClient),
  })
}

export function useMarkFailedVendorSubmissionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...payload }) =>
      post(
        ENDPOINTS.VENDOR_SUBMISSIONS.MARK_FAILED(id),
        buildMarkFailedVendorSubmissionPayload(payload),
      ),
    onSuccess: () => invalidateVendorSubmissionFlow(queryClient),
  })
}

export function useRetryVendorSubmissionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...payload }) =>
      post(ENDPOINTS.VENDOR_SUBMISSIONS.RETRY(id), buildRetryVendorSubmissionPayload(payload)),
    onSuccess: () => invalidateVendorSubmissionFlow(queryClient),
  })
}

export function useCancelVendorSubmissionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...payload }) =>
      post(ENDPOINTS.VENDOR_SUBMISSIONS.CANCEL(id), buildCancelVendorSubmissionPayload(payload)),
    onSuccess: () => invalidateVendorSubmissionFlow(queryClient),
  })
}

export function useCreateShipmentFromVendorSubmissionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (vendorSubmissionId) =>
      post(ENDPOINTS.SHIPMENTS.FROM_VENDOR_SUBMISSION(vendorSubmissionId)),
    onSuccess: () => invalidateVendorSubmissionFlow(queryClient),
  })
}
