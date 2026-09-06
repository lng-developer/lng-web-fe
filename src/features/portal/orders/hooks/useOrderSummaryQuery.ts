import { useQuery } from '@tanstack/react-query'

import { getOrderSummary, type OrderSummary, type OrderWorkbenchParams } from '../api/orderApi'
import { orderKeys } from '../api/orderKeys'

type QueryOptions = Partial<Parameters<typeof useQuery<OrderSummary>>[0]>

export function useOrderSummaryQuery(params: OrderWorkbenchParams, options?: QueryOptions) {
  return useQuery({
    queryKey: orderKeys.summary(params),
    queryFn: () => getOrderSummary(params),
    retry: false,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    ...options,
  })
}

export default useOrderSummaryQuery
