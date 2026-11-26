import { keepPreviousData, useQuery } from '@tanstack/react-query'

import {
  listOrderWorkbenchDetails,
  listOrderWorkbenchSummary,
  type OrderWorkbenchParams,
} from '../api/orderApi'
import { orderKeys } from '../api/orderKeys'

export const ORDER_WORKBENCH_DETAIL_BATCH_SIZE = 5

export function useOrderWorkbenchQuery(params: OrderWorkbenchParams) {
  return useQuery({
    queryKey: orderKeys.workbenchSummary(params),
    queryFn: ({ signal }) => listOrderWorkbenchSummary(params, signal),
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  })
}

export function useOrderWorkbenchDetailsQuery(orderIds: readonly string[], visible: boolean) {
  return useQuery({
    queryKey: orderKeys.workbenchDetails(orderIds),
    queryFn: ({ signal }) => listOrderWorkbenchDetails(orderIds, signal),
    enabled: visible && orderIds.length > 0,
    retry: false,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  })
}

export default useOrderWorkbenchQuery
