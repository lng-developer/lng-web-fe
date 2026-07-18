import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import {
  buildCreateShopPayload,
  buildUpdateShopStatusPayload,
  unwrapApiData,
} from '../utils/shopsApi'
import { shopsKeys } from './shops.keys'

function invalidateShops(queryClient) {
  queryClient.invalidateQueries({ queryKey: shopsKeys.all })
}

export function useCreateShopMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload) =>
      apiClient.post(ENDPOINTS.SHOPS.LIST, buildCreateShopPayload(payload)).then(unwrapApiData),
    onSuccess: () => invalidateShops(queryClient),
  })
}

export function useUpdateShopStatusMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }) =>
      apiClient
        .patch(ENDPOINTS.SHOPS.STATUS(id), buildUpdateShopStatusPayload({ status }))
        .then(unwrapApiData),
    onSuccess: () => invalidateShops(queryClient),
  })
}
