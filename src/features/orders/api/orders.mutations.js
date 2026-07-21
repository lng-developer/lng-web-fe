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

function invalidateOrderLists(queryClient) {
  queryClient.invalidateQueries({
    queryKey: [...ordersKeys.all, 'list'],
    refetchType: 'active',
  })
  queryClient.invalidateQueries({
    queryKey: [...ordersKeys.all, 'workbench'],
    refetchType: 'active',
  })
  queryClient.invalidateQueries({
    queryKey: [...ordersKeys.all, 'summary'],
    refetchType: 'active',
  })
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
      invalidateOrderLists(queryClient)
    },
  })
}

export function useRetryImportJobMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ jobId }) =>
      apiClient.post(ENDPOINTS.ORDER_IMPORTS.JOB_RETRY(jobId)).then(unwrapApiData),
    onSuccess: () => invalidateOrderLists(queryClient),
  })
}

export function useUpdateOrderBuyerMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orderId, ...payload }) =>
      apiClient.patch(ENDPOINTS.ORDERS.BUYER(orderId), payload).then(unwrapApiData),
    onSuccess: (_, variables) => {
      invalidateOrderLists(queryClient)
      queryClient.invalidateQueries({ queryKey: ordersKeys.detail(variables.orderId) })
    },
  })
}

export function useCreateOrderCaseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload) => apiClient.post(ENDPOINTS.ORDERS.CASES, payload).then(unwrapApiData),
    onSuccess: () => invalidateOrderLists(queryClient),
  })
}

export function useUpdateOrderCaseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ caseId, ...payload }) =>
      apiClient.patch(ENDPOINTS.ORDERS.CASE(caseId), payload).then(unwrapApiData),
    onSuccess: (_, variables) => {
      invalidateOrderLists(queryClient)
      queryClient.invalidateQueries({ queryKey: ordersKeys.caseDetail(variables.caseId) })
    },
  })
}

export function useResolveOrderCaseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ caseId, ...payload }) =>
      apiClient.post(ENDPOINTS.ORDERS.CASE_RESOLVE(caseId), payload).then(unwrapApiData),
    onSuccess: () => invalidateOrderLists(queryClient),
  })
}

export function useCancelOrderCaseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ caseId, ...payload }) =>
      apiClient.post(ENDPOINTS.ORDERS.CASE_CANCEL(caseId), payload).then(unwrapApiData),
    onSuccess: () => invalidateOrderLists(queryClient),
  })
}

export function useAddOrderCaseCommentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ caseId, ...payload }) =>
      apiClient.post(ENDPOINTS.ORDERS.CASE_COMMENTS(caseId), payload).then(unwrapApiData),
    onSuccess: () => invalidateOrderLists(queryClient),
  })
}

export function useUpdateOrderShippingAddressMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orderId, ...payload }) =>
      apiClient.patch(ENDPOINTS.ORDERS.SHIPPING_ADDRESS(orderId), payload).then(unwrapApiData),
    onSuccess: (_, variables) => {
      invalidateOrderLists(queryClient)
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
      invalidateOrderLists(queryClient)
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
      invalidateOrderLists(queryClient)
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
      invalidateOrderLists(queryClient)
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
      invalidateOrderLists(queryClient)
      queryClient.invalidateQueries({ queryKey: ordersKeys.itemReadiness(variables.orderItemId) })
    },
  })
}

export function useRecheckOrderItemMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orderItemId, ...payload }) =>
      apiClient.post(ENDPOINTS.ORDERS.ITEM_RECHECK(orderItemId), payload).then(unwrapApiData),
    onSuccess: () => invalidateOrderLists(queryClient),
  })
}

export function useCreateOrderItemReplacementMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orderItemId, ...payload }) =>
      apiClient.post(ENDPOINTS.ORDERS.ITEM_REPLACEMENT(orderItemId), payload).then(unwrapApiData),
    onSuccess: () => invalidateOrderLists(queryClient),
  })
}

export function useCancelOrderItemMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orderItemId, ...payload }) =>
      apiClient.post(ENDPOINTS.ORDERS.ITEM_CANCEL(orderItemId), payload).then(unwrapApiData),
    onSuccess: () => invalidateOrderLists(queryClient),
  })
}

export function useUpdateOrderItemCsNoteMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orderItemId, csNote }) =>
      apiClient.patch(ENDPOINTS.ORDERS.ITEM_CS_NOTE(orderItemId), { csNote }).then(unwrapApiData),
    onSuccess: (_, variables) => {
      invalidateOrderLists(queryClient)
      queryClient.invalidateQueries({ queryKey: ordersKeys.item(variables.orderItemId) })
    },
  })
}
