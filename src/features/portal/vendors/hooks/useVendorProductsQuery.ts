import { useQuery } from '@tanstack/react-query'

import { listVendorProducts, type ProductListParams } from '../api/vendorApi'
import { vendorKeys } from '../api/vendorKeys'

export interface UseVendorProductsQueryOptions {
  enabled?: boolean
  staleTime?: number
  retry?: boolean | number
}

export function useVendorProductsQuery(
  vendorId: string,
  params: ProductListParams,
  options?: UseVendorProductsQueryOptions,
) {
  return useQuery({
    queryKey: vendorKeys.products(vendorId, params),
    queryFn: () => listVendorProducts(params),
    retry: options?.retry ?? false,
    enabled: options?.enabled,
    staleTime: options?.staleTime,
  })
}

export default useVendorProductsQuery
