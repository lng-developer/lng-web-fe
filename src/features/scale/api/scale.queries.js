import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import {
  buildProductionSummaryQuery,
  buildProductionTaskQuery,
  mapProductionListResponse,
  mapScaleAssignees,
  mapScaleSummary,
  mapShopOptions,
  unwrapApiData,
} from '../utils/scaleApi'
import { scaleKeys } from './scale.keys'

function get(path, query) {
  return apiClient.get(path, { params: query }).then(unwrapApiData)
}

export function useScaleTasksQuery(query = {}, options = {}) {
  const requestQuery = buildProductionTaskQuery(query)

  return useQuery({
    queryKey: scaleKeys.tasks(requestQuery),
    queryFn: () =>
      get(ENDPOINTS.SCALE.TASKS, requestQuery).then((response) =>
        mapProductionListResponse(response),
      ),
    placeholderData: keepPreviousData,
    ...options,
  })
}

export function useScaleSummaryQuery(query = {}, options = {}) {
  const requestQuery = buildProductionSummaryQuery(query)

  return useQuery({
    queryKey: scaleKeys.summary(requestQuery),
    queryFn: () => get(ENDPOINTS.SCALE.SUMMARY, requestQuery).then(mapScaleSummary),
    placeholderData: keepPreviousData,
    ...options,
  })
}

export function useScaleAssigneesQuery(query = {}, options = {}) {
  return useQuery({
    queryKey: scaleKeys.assignees(query),
    queryFn: () =>
      get(ENDPOINTS.SCALE.ASSIGNEES, query).then((response) =>
        mapScaleAssignees(response?.items || []),
      ),
    staleTime: 5 * 60 * 1000,
    ...options,
  })
}

export function useScaleCsAssigneesQuery(query = {}, options = {}) {
  return useQuery({
    queryKey: scaleKeys.csAssignees(query),
    queryFn: () =>
      get(ENDPOINTS.PRODUCTION.CS_ASSIGNEES, query).then((response) =>
        mapScaleAssignees(response?.items || []),
      ),
    staleTime: 5 * 60 * 1000,
    ...options,
  })
}

export function useScaleShopsQuery(query = {}, options = {}) {
  return useQuery({
    queryKey: scaleKeys.shops(query),
    queryFn: () =>
      get(ENDPOINTS.SHOPS.LIST, query).then((response) => mapShopOptions(response?.items || [])),
    staleTime: 5 * 60 * 1000,
    ...options,
  })
}
