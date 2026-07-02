import { useQuery } from '@tanstack/react-query'

import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import { ordersKeys } from './orders.keys'

export function useOrdersQuery(query) {
  return useQuery({
    queryKey: ordersKeys.list(query),
    queryFn: () => apiClient.get(ENDPOINTS.ORDERS.LIST, { params: query }),
    enabled: false,
  })
}

export function useOrderDetailQuery(orderId) {
  return useQuery({
    queryKey: ordersKeys.detail(orderId),
    queryFn: () => apiClient.get(ENDPOINTS.ORDERS.DETAIL(orderId)),
    enabled: false,
  })
}
