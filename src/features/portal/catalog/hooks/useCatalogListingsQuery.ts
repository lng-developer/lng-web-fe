import { useMemo } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { useDebouncedValue } from '@/shared/ui'

import {
  type CatalogListParams,
  type CatalogSummaryParams,
  getListingOptions,
  getListingSummary,
  listListings,
} from '../api/catalogApi'
import { catalogKeys } from '../api/catalogKeys'

export interface UseCatalogListingsQueryParams {
  page: number
  pageSize: number
  search: string
  shopId?: string
  salesChannelCode?: string
  qcStatus?: string
  psdState?: 'missing' | 'ready'
  sort?: string
}

export function useCatalogListingsQuery({
  page,
  pageSize,
  search,
  shopId,
  salesChannelCode,
  qcStatus,
  psdState,
  sort,
}: UseCatalogListingsQueryParams) {
  const debouncedSearch = useDebouncedValue(search, 250)

  const params = useMemo<CatalogListParams>(
    () => ({
      page,
      limit: pageSize,
      search: debouncedSearch || undefined,
      shopId,
      salesChannelCode,
      qcStatus,
      psdState,
      sort,
    }),
    [page, pageSize, debouncedSearch, shopId, salesChannelCode, qcStatus, psdState, sort],
  )

  const summaryParams = useMemo<CatalogSummaryParams>(
    () => ({
      search: params.search,
      shopId,
      salesChannelCode,
      qcStatus,
      psdState,
    }),
    [params.search, shopId, salesChannelCode, qcStatus, psdState],
  )

  const options = useQuery({
    queryKey: catalogKeys.options(),
    queryFn: getListingOptions,
    retry: false,
  })

  const listings = useQuery({
    queryKey: catalogKeys.list(params),
    queryFn: () => listListings(params),
    placeholderData: keepPreviousData,
    retry: false,
  })

  const summary = useQuery({
    queryKey: catalogKeys.summary(summaryParams),
    queryFn: () => getListingSummary(summaryParams),
    retry: false,
  })

  return {
    debouncedSearch,
    params,
    summaryParams,
    options,
    listings,
    summary,
  }
}
