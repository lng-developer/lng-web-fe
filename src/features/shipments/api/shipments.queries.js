import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import {
  buildShipmentListQuery,
  buildWebhookLogQuery,
  mapShipmentResponse,
  mapShipmentsResponse,
  mapWebhookLogsResponse,
  unwrapApiData,
} from '../utils/shipmentsApi'
import { shipmentsKeys } from './shipments.keys'

export function useShipmentsQuery(query = {}, options = {}) {
  const params = buildShipmentListQuery(query)

  return useQuery({
    queryKey: shipmentsKeys.list(params),
    queryFn: () =>
      apiClient
        .get(ENDPOINTS.SHIPMENTS.LIST, { params })
        .then(unwrapApiData)
        .then(mapShipmentsResponse),
    placeholderData: keepPreviousData,
    ...options,
  })
}

export function useShipmentsSummaryQuery(query = {}, options = {}) {
  return useQuery({
    queryKey: shipmentsKeys.summary(query),
    queryFn: () =>
      apiClient.get(ENDPOINTS.SHIPMENTS.SUMMARY, { params: query }).then(unwrapApiData),
    placeholderData: keepPreviousData,
    ...options,
  })
}

export function useShipmentDetailQuery(id, options = {}) {
  return useQuery({
    queryKey: shipmentsKeys.detail(id),
    queryFn: () =>
      apiClient.get(ENDPOINTS.SHIPMENTS.DETAIL(id)).then(unwrapApiData).then(mapShipmentResponse),
    enabled: Boolean(id),
    ...options,
  })
}

export function useShipmentWebhookLogsQuery(query = {}, options = {}) {
  const params = buildWebhookLogQuery(query)

  return useQuery({
    queryKey: shipmentsKeys.webhookLogs(params),
    queryFn: () =>
      apiClient
        .get(ENDPOINTS.SHIPMENTS.VENDOR_WEBHOOK_LOGS, { params })
        .then(unwrapApiData)
        .then(mapWebhookLogsResponse),
    placeholderData: keepPreviousData,
    ...options,
  })
}
