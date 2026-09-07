import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { listVendors } from '../api/vendorApi'
import { vendorKeys } from '../api/vendorKeys'

const SUMMARY_PARAMS = { limit: 100, page: 1 }

export function useVendorMetricsQuery() {
  const query = useQuery({
    queryKey: vendorKeys.vendors(SUMMARY_PARAMS),
    queryFn: () => listVendors(SUMMARY_PARAMS),
    retry: false,
    staleTime: 30_000,
  })

  const vendorItems = useMemo(() => query.data?.items ?? [], [query.data?.items])
  const totalCount = query.data?.pagination.total ?? vendorItems.length
  const activeCount = useMemo(
    () => vendorItems.filter((vendor) => vendor.status === 'ACTIVE').length,
    [vendorItems],
  )
  const integratedCount = useMemo(
    () =>
      vendorItems.filter((vendor) => vendor.providerKey && vendor.providerKey !== 'CUSTOM').length,
    [vendorItems],
  )

  return {
    ...query,
    totalCount,
    activeCount,
    integratedCount,
  }
}

export default useVendorMetricsQuery
