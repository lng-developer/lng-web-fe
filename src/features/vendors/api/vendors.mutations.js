import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import { unwrapApiData } from '../utils/vendorsApi'
import { vendorsKeys } from './vendors.keys'

function patch(path, payload) {
  return apiClient.patch(path, payload).then(unwrapApiData)
}

export function useUpdateVendorProductMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ productId, payload }) => patch(ENDPOINTS.VENDORS.PRODUCT(productId), payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorsKeys.products() })
    },
  })
}
