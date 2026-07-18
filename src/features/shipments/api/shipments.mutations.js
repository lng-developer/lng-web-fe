import { useMutation, useQueryClient } from '@tanstack/react-query'

import { ordersKeys } from '@/features/orders/api/orders.keys'
import { vendorSubmissionsKeys } from '@/features/vendor-submissions/api/vendorSubmissions.keys'
import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import {
  buildSubmittedTrackingRecheckPayload,
  buildUpdateShipmentStatusPayload,
  buildUpdateShipmentTrackingPayload,
  buildVendorTrackingRecheckPayload,
  unwrapApiData,
} from '../utils/shipmentsApi'
import { shipmentsKeys } from './shipments.keys'

function invalidateShipmentFlow(queryClient) {
  queryClient.invalidateQueries({ queryKey: shipmentsKeys.all })
  queryClient.invalidateQueries({ queryKey: vendorSubmissionsKeys.all })
  queryClient.invalidateQueries({ queryKey: ordersKeys.all })
}

function post(path, payload) {
  return apiClient.post(path, payload).then(unwrapApiData)
}

function patch(path, payload) {
  return apiClient.patch(path, payload).then(unwrapApiData)
}

export function useCreateShipmentFromVendorSubmissionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (vendorSubmissionId) =>
      post(ENDPOINTS.SHIPMENTS.FROM_VENDOR_SUBMISSION(vendorSubmissionId)),
    onSuccess: () => invalidateShipmentFlow(queryClient),
  })
}

export function useUpdateShipmentTrackingMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...payload }) =>
      patch(ENDPOINTS.SHIPMENTS.TRACKING(id), buildUpdateShipmentTrackingPayload(payload)),
    onSuccess: () => invalidateShipmentFlow(queryClient),
  })
}

export function useUpdateShipmentStatusMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...payload }) =>
      patch(ENDPOINTS.SHIPMENTS.STATUS(id), buildUpdateShipmentStatusPayload(payload)),
    onSuccess: () => invalidateShipmentFlow(queryClient),
  })
}

export function useRecheckVendorTrackingMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload) =>
      post(ENDPOINTS.SHIPMENTS.RECHECK_VENDOR_TRACKING, buildVendorTrackingRecheckPayload(payload)),
    onSuccess: () => invalidateShipmentFlow(queryClient),
  })
}

export function useRecheckSubmittedVendorTrackingMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload = {}) =>
      post(
        ENDPOINTS.SHIPMENTS.RECHECK_SUBMITTED_VENDOR_TRACKING,
        buildSubmittedTrackingRecheckPayload(payload),
      ),
    onSuccess: () => invalidateShipmentFlow(queryClient),
  })
}
