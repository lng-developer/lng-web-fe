import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import { productionKeys } from './production.keys'

function unwrapApiData(response) {
  return response?.success && Object.hasOwn(response, 'data') ? response.data : response
}

function get(path, query) {
  return apiClient.get(path, { params: query }).then(unwrapApiData)
}

export function useProductionTasksQuery(query = {}, options = {}) {
  return useQuery({
    queryKey: productionKeys.tasks(query),
    queryFn: () => get(ENDPOINTS.PRODUCTION.TASKS, query),
    placeholderData: keepPreviousData,
    ...options,
  })
}

export function useProductionSummaryQuery(query = {}, options = {}) {
  return useQuery({
    queryKey: productionKeys.summary(query),
    queryFn: () => get(ENDPOINTS.PRODUCTION.SUMMARY, query),
    placeholderData: keepPreviousData,
    ...options,
  })
}

export function useProductionTaskByOrderItemQuery(orderItemId, options = {}) {
  return useQuery({
    queryKey: productionKeys.taskByOrderItem(orderItemId),
    queryFn: () => get(ENDPOINTS.PRODUCTION.TASK_BY_ORDER_ITEM(orderItemId)),
    enabled: Boolean(orderItemId),
    ...options,
  })
}

export function useProductionShopsQuery(query = {}, options = {}) {
  return useQuery({
    queryKey: productionKeys.shops(query),
    queryFn: () => get(ENDPOINTS.SHOPS.LIST, query),
    placeholderData: keepPreviousData,
    ...options,
  })
}
