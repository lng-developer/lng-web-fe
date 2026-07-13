import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import { unwrapApiData } from '../utils/vendorsApi'
import { vendorsKeys } from './vendors.keys'

function patch(path, payload) {
  return apiClient.patch(path, payload).then(unwrapApiData)
}

function post(path, payload) {
  return apiClient.post(path, payload).then(unwrapApiData)
}

export function useCreateVendorMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload) => post(ENDPOINTS.VENDORS.LIST, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorsKeys.lists() })
    },
  })
}

export function useUpdateVendorMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ vendorId, payload }) => patch(ENDPOINTS.VENDORS.DETAIL(vendorId), payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorsKeys.lists() })
    },
  })
}

export function useCreateVendorProductMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload) => post(ENDPOINTS.VENDORS.PRODUCTS, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorsKeys.products() })
    },
  })
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

export function useCreateVendorCostCenterMutation(productId) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload) => post(ENDPOINTS.VENDORS.COST_CENTERS(productId), payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorsKeys.costCenters(productId) })
      queryClient.invalidateQueries({ queryKey: vendorsKeys.products() })
    },
  })
}

export function useUpdateVendorCostCenterMutation(productId) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ costCenterId, payload }) =>
      patch(ENDPOINTS.VENDORS.COST_CENTER(productId, costCenterId), payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorsKeys.costCenters(productId) })
      queryClient.invalidateQueries({ queryKey: vendorsKeys.products() })
    },
  })
}
