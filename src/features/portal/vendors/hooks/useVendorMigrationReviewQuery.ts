import { useQuery } from '@tanstack/react-query'

import { listVendorMigrationReview } from '../api/vendorApi'
import { vendorKeys } from '../api/vendorKeys'

export interface VendorMigrationReviewQueryParams {
  page?: number
  limit?: number
  q?: string
  vendorId?: string
}

export interface UseVendorMigrationReviewQueryOptions {
  enabled?: boolean
  staleTime?: number
  retry?: boolean | number
}

export function useVendorMigrationReviewQuery(
  params: VendorMigrationReviewQueryParams,
  options?: UseVendorMigrationReviewQueryOptions,
) {
  return useQuery({
    queryKey: vendorKeys.migrationReview(params),
    queryFn: () => listVendorMigrationReview(params),
    enabled: options?.enabled,
    retry: options?.retry ?? false,
    staleTime: options?.staleTime,
  })
}

export default useVendorMigrationReviewQuery
