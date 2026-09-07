import { useQuery } from '@tanstack/react-query'

import { listVendors, type VendorListParams } from '../api/vendorApi'
import { vendorKeys } from '../api/vendorKeys'

export interface UseVendorsQueryOptions {
  enabled?: boolean
  staleTime?: number
  retry?: boolean | number
}

export function useVendorsQuery(params: VendorListParams, options?: UseVendorsQueryOptions) {
  return useQuery({
    queryKey: vendorKeys.vendors(params),
    queryFn: () => listVendors(params),
    retry: options?.retry ?? false,
    enabled: options?.enabled,
    staleTime: options?.staleTime,
  })
}

export default useVendorsQuery
