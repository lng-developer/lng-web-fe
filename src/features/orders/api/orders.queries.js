import { useQuery } from '@tanstack/react-query'

import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import { ordersKeys } from './orders.keys'

function unwrapApiData(response) {
  return response?.success && Object.hasOwn(response, 'data') ? response.data : response
}

function get(path, query) {
  return apiClient.get(path, { params: query }).then(unwrapApiData)
}

export function useOrdersQuery(query = {}, options = {}) {
  return useQuery({
    queryKey: ordersKeys.list(query),
    queryFn: () => get(ENDPOINTS.ORDERS.LIST, query),
    ...options,
  })
}

export function useOrderWorkbenchQuery(query = {}, options = {}) {
  return useQuery({
    queryKey: ordersKeys.workbench(query),
    queryFn: () => get(ENDPOINTS.ORDERS.WORKBENCH, query),
    ...options,
  })
}

export function useOrderSummaryQuery(query = {}, options = {}) {
  return useQuery({
    queryKey: ordersKeys.summary(query),
    queryFn: () => get(ENDPOINTS.ORDERS.SUMMARY, query),
    keepPreviousData: true,
    ...options,
  })
}

export function useCustomerExceptionsQuery(query = {}, options = {}) {
  return useQuery({
    queryKey: ordersKeys.customerExceptions(query),
    queryFn: () => get(ENDPOINTS.ORDERS.CUSTOMER_EXCEPTIONS, query),
    keepPreviousData: true,
    ...options,
  })
}

export function useOrderCasesQuery(query = {}, options = {}) {
  return useQuery({
    queryKey: ordersKeys.cases(query),
    queryFn: () => get(ENDPOINTS.ORDERS.CASES, query),
    keepPreviousData: true,
    ...options,
  })
}

export function useOrderCaseQuery(caseId, options = {}) {
  return useQuery({
    queryKey: ordersKeys.caseDetail(caseId),
    queryFn: () => get(ENDPOINTS.ORDERS.CASE(caseId)),
    enabled: Boolean(caseId),
    ...options,
  })
}

export function useOrderDetailQuery(orderId, options = {}) {
  return useQuery({
    queryKey: ordersKeys.detail(orderId),
    queryFn: () => get(ENDPOINTS.ORDERS.DETAIL(orderId)),
    enabled: Boolean(orderId),
    ...options,
  })
}

export function useOrderTimelineQuery(orderId, options = {}) {
  return useQuery({
    queryKey: ordersKeys.timeline(orderId),
    queryFn: () => get(ENDPOINTS.ORDERS.TIMELINE(orderId)),
    enabled: Boolean(orderId),
    ...options,
  })
}

export function useExpandedOrderQuery(orderId, options = {}) {
  return useQuery({
    queryKey: ordersKeys.expanded(orderId),
    queryFn: () => get(ENDPOINTS.ORDERS.EXPANDED(orderId)),
    enabled: Boolean(orderId),
    ...options,
  })
}

export function useOrderItemQuery(orderItemId, options = {}) {
  return useQuery({
    queryKey: ordersKeys.item(orderItemId),
    queryFn: () => get(ENDPOINTS.ORDERS.ITEM(orderItemId)),
    enabled: Boolean(orderItemId),
    ...options,
  })
}

export function useOrderItemTimelineQuery(orderItemId, options = {}) {
  return useQuery({
    queryKey: ordersKeys.itemTimeline(orderItemId),
    queryFn: () => get(ENDPOINTS.ORDERS.ITEM_TIMELINE(orderItemId)),
    enabled: Boolean(orderItemId),
    ...options,
  })
}

export function useOrderItemsQuery(orderId, query = {}, options = {}) {
  return useQuery({
    queryKey: ordersKeys.items(orderId, query),
    queryFn: () => get(ENDPOINTS.ORDERS.ITEMS(orderId), query),
    enabled: Boolean(orderId),
    ...options,
  })
}

export function useOrderItemCustomizationQuery(orderItemId, options = {}) {
  return useQuery({
    queryKey: ordersKeys.itemCustomization(orderItemId),
    queryFn: () => get(ENDPOINTS.CUSTOMIZATIONS.BY_ORDER_ITEM(orderItemId)),
    enabled: Boolean(orderItemId),
    retry: false,
    ...options,
  })
}

export function useOrderItemReadinessQuery(orderItemId, options = {}) {
  return useQuery({
    queryKey: ordersKeys.itemReadiness(orderItemId),
    queryFn: () => get(ENDPOINTS.ORDERS.ITEM_READINESS(orderItemId)),
    enabled: Boolean(orderItemId),
    ...options,
  })
}

export function useShopsQuery(query = {}, options = {}) {
  return useQuery({
    queryKey: ordersKeys.shops(query),
    queryFn: () => get(ENDPOINTS.SHOPS.LIST, query),
    keepPreviousData: true,
    ...options,
  })
}

export function useImportJobQuery(jobId, options = {}) {
  return useQuery({
    queryKey: ordersKeys.importJob(jobId),
    queryFn: () => get(ENDPOINTS.ORDER_IMPORTS.JOB(jobId)),
    enabled: Boolean(jobId),
    ...options,
  })
}

export function useImportJobIssuesQuery(jobId, query = {}, options = {}) {
  return useQuery({
    queryKey: ordersKeys.importJobIssues(jobId, query),
    queryFn: () => get(ENDPOINTS.ORDER_IMPORTS.JOB_ISSUES(jobId), query),
    enabled: Boolean(jobId),
    ...options,
  })
}

export function useImportJobRawRecordsQuery(jobId, query = {}, options = {}) {
  return useQuery({
    queryKey: ordersKeys.importJobRawRecords(jobId, query),
    queryFn: () => get(ENDPOINTS.ORDER_IMPORTS.JOB_RAW_RECORDS(jobId), query),
    enabled: Boolean(jobId),
    ...options,
  })
}

export function useImportIssuesQuery(query = {}, options = {}) {
  return useQuery({
    queryKey: ordersKeys.importIssues(query),
    queryFn: () => get(ENDPOINTS.ORDER_IMPORTS.ISSUES, query),
    keepPreviousData: true,
    ...options,
  })
}
