import { keepPreviousData, useQuery } from '@tanstack/react-query'

import {
  listProductionTasks,
  type ProductionParams,
  summarizeProductionQueueCounts,
  summarizeProductionTasks,
} from '../api/productionApi'
import { productionKeys } from '../api/productionKeys'

export interface UseProductionTasksQueryParams extends ProductionParams {
  readonly enabled?: boolean
}

export function useProductionTasksQuery(params: UseProductionTasksQueryParams) {
  const { enabled = true, ...queryParams } = params

  return useQuery({
    queryKey: productionKeys.list(queryParams),
    queryFn: ({ signal }) => listProductionTasks(queryParams, signal),
    placeholderData: keepPreviousData,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: false,
    enabled,
  })
}

export function useProductionQueueCountsQuery(
  filters: Pick<ProductionParams, 'search' | 'salesChannelCode'>,
  options?: { readonly enabled?: boolean },
) {
  return useQuery({
    queryKey: productionKeys.queueSummary(filters),
    queryFn: ({ signal }) => summarizeProductionQueueCounts(filters, signal),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: false,
    enabled: options?.enabled ?? true,
  })
}

export function useProductionSummaryQuery(
  filters: Omit<ProductionParams, 'page' | 'limit'>,
  options?: { readonly enabled?: boolean },
) {
  return useQuery({
    queryKey: productionKeys.summary(filters),
    queryFn: ({ signal }) => summarizeProductionTasks(filters, signal),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: false,
    enabled: options?.enabled ?? true,
  })
}
