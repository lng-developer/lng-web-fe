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
    queryFn: () => listProductionTasks(queryParams),
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
    queryFn: () => summarizeProductionQueueCounts(filters),
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
    queryFn: () => summarizeProductionTasks(filters),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    retry: false,
    enabled: options?.enabled ?? true,
  })
}
