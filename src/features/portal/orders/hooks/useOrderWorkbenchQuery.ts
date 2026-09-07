import { useQuery } from '@tanstack/react-query'

import { listOrderWorkbench, type OrderWorkbenchParams } from '../api/orderApi'
import { orderKeys } from '../api/orderKeys'

export function useOrderWorkbenchQuery(params: OrderWorkbenchParams) {
  return useQuery({
    queryKey: orderKeys.workbench(params),
    queryFn: () => listOrderWorkbench(params),
    retry: false,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  })
}

export default useOrderWorkbenchQuery
