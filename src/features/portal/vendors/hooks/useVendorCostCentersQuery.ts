import { useQuery } from '@tanstack/react-query'

import { type CostCenterListParams, listVendorCostCenters } from '../api/vendorApi'
import { vendorKeys } from '../api/vendorKeys'

export interface UseVendorCostCentersQueryOptions {
  enabled?: boolean
  staleTime?: number
  retry?: boolean | number
}

export function useVendorCostCentersQuery(
  productId: string,
  params: CostCenterListParams,
  options?: UseVendorCostCentersQueryOptions,
) {
  return useQuery({
    queryKey: vendorKeys.costCenters(productId, params),
    queryFn: () => listVendorCostCenters(productId, params),
    retry: options?.retry ?? false,
    enabled: options?.enabled,
    staleTime: options?.staleTime,
  })
}

export default useVendorCostCentersQuery
