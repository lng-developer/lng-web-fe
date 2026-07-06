import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import { ordersKeys } from './orders.keys'

function unwrapApiData(response) {
  return response?.success && Object.hasOwn(response, 'data') ? response.data : response
}

function buildImportFormData({
  file,
  marketplaceCode,
  shopId,
  shopConnectionId,
  externalAccountId,
}) {
  const formData = new FormData()

  formData.append('shopId', shopId)
  formData.append('marketplaceCode', marketplaceCode)
  if (shopConnectionId) formData.append('shopConnectionId', shopConnectionId)
  if (externalAccountId) formData.append('externalAccountId', externalAccountId)
  if (file) formData.append('file', file)

  return formData
}

function getImportEndpoint(source) {
  return source === 'ETSY_SOLD_ORDER_ITEMS'
    ? ENDPOINTS.ORDER_IMPORTS.ETSY_SOLD_ORDER_ITEMS
    : ENDPOINTS.ORDER_IMPORTS.MANUAL_EXCEL
}

export function useImportOrdersMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ source, ...payload }) =>
      apiClient
        .post(getImportEndpoint(source), buildImportFormData(payload), {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then(unwrapApiData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ordersKeys.all })
    },
  })
}

export function useUpdateOrderBuyerMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orderId, ...payload }) =>
      apiClient.patch(ENDPOINTS.ORDERS.BUYER(orderId), payload).then(unwrapApiData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ordersKeys.all })
      queryClient.invalidateQueries({ queryKey: ordersKeys.detail(variables.orderId) })
    },
  })
}

export function useUpdateOrderShippingAddressMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orderId, ...payload }) =>
      apiClient.patch(ENDPOINTS.ORDERS.SHIPPING_ADDRESS(orderId), payload).then(unwrapApiData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ordersKeys.all })
      queryClient.invalidateQueries({ queryKey: ordersKeys.detail(variables.orderId) })
    },
  })
}

export function useUpdateOrderShippingServiceMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orderId, ...payload }) =>
      apiClient.patch(ENDPOINTS.ORDERS.SHIPPING_SERVICE(orderId), payload).then(unwrapApiData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ordersKeys.all })
      queryClient.invalidateQueries({ queryKey: ordersKeys.detail(variables.orderId) })
    },
  })
}

export function useUpdateOrderCaseStatusMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orderId, caseStatus }) =>
      apiClient.patch(ENDPOINTS.ORDERS.CASE_STATUS(orderId), { caseStatus }).then(unwrapApiData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ordersKeys.all })
      queryClient.invalidateQueries({ queryKey: ordersKeys.detail(variables.orderId) })
    },
  })
}

export function useValidateOrderAddressMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orderId }) =>
      apiClient.post(ENDPOINTS.ORDERS.VALIDATE_ADDRESS(orderId)).then(unwrapApiData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ordersKeys.all })
      queryClient.invalidateQueries({ queryKey: ordersKeys.detail(variables.orderId) })
    },
  })
}

export function useAssignOrderStaffMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orderId, assignedStaffId }) =>
      apiClient
        .patch(ENDPOINTS.ORDERS.ASSIGNED_STAFF(orderId), { assignedStaffId })
        .then(unwrapApiData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ordersKeys.all })
      queryClient.invalidateQueries({ queryKey: ordersKeys.detail(variables.orderId) })
    },
  })
}

export function useMarkFulfillmentReadyMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orderItemId }) =>
      apiClient.post(ENDPOINTS.ORDERS.MARK_FULFILLMENT_READY(orderItemId)).then(unwrapApiData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ordersKeys.all })
      queryClient.invalidateQueries({ queryKey: ordersKeys.itemReadiness(variables.orderItemId) })
    },
  })
}
