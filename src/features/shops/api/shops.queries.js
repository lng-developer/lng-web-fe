import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import {
  buildShopListQuery,
  mapShopResponse,
  mapShopsResponse,
  unwrapApiData,
} from '../utils/shopsApi'
import { shopsKeys } from './shops.keys'

export function useShopsQuery(query = {}, options = {}) {
  const params = buildShopListQuery(query)

  return useQuery({
    queryKey: shopsKeys.list(params),
    queryFn: () =>
      apiClient.get(ENDPOINTS.SHOPS.LIST, { params }).then(unwrapApiData).then(mapShopsResponse),
    placeholderData: keepPreviousData,
    ...options,
  })
}

export function useShopDetailQuery(id, options = {}) {
  return useQuery({
    queryKey: shopsKeys.detail(id),
    queryFn: () =>
      apiClient.get(ENDPOINTS.SHOPS.DETAIL(id)).then(unwrapApiData).then(mapShopResponse),
    enabled: Boolean(id),
    ...options,
  })
}
