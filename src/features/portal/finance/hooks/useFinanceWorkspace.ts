import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { listShops } from '@/features/portal/shops/api/shopApi'
import type { DateRangeValue } from '@/shared/ui'
import { useDebouncedValue } from '@/shared/ui'

import { listFinanceFilterOptions, listFinanceSnapshots } from '../api/financeApi'

export interface UseFinanceWorkspaceParams {
  globalRead: boolean
  page: number
  pageSize: number
  search: string
  costStatus?: string
  salesChannelCode?: string
  sellerEmployeeCode?: string
  teamId?: string
  departmentId?: string
  dates: DateRangeValue
}

export const useFinanceWorkspace = ({
  globalRead,
  page,
  pageSize,
  search,
  costStatus,
  salesChannelCode,
  sellerEmployeeCode,
  teamId,
  departmentId,
  dates,
}: UseFinanceWorkspaceParams) => {
  const debouncedSearch = useDebouncedValue(search, 250)

  const queryParams = useMemo(
    () => ({
      page,
      limit: pageSize,
      externalOrderId: debouncedSearch || undefined,
      costStatus,
      salesChannelCode,
      sellerEmployeeCode,
      teamId,
      departmentId,
      ...dates,
    }),
    [
      page,
      pageSize,
      debouncedSearch,
      costStatus,
      salesChannelCode,
      sellerEmployeeCode,
      teamId,
      departmentId,
      dates,
    ],
  )

  const snapshots = useQuery({
    queryKey: ['finance', 'snapshots', queryParams],
    queryFn: () => listFinanceSnapshots(queryParams),
    retry: false,
  })

  const filterOptions = useQuery({
    queryKey: ['finance', 'filter-options'],
    queryFn: listFinanceFilterOptions,
    retry: false,
  })

  const shops = useQuery({
    queryKey: ['shops', 'finance-import'],
    queryFn: () => listShops({ page: 1, limit: 100, status: 'ACTIVE' }),
    enabled: globalRead,
    retry: false,
  })

  const shopNameById = useMemo(
    () => new Map((shops.data?.items || []).map((shop) => [shop.id, shop.name])),
    [shops.data?.items],
  )

  return {
    snapshots,
    filterOptions,
    shops,
    shopNameById,
    queryParams,
  }
}
