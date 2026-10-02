import { useQuery } from '@tanstack/react-query'

import { listCashFlow, type CashFlowQuery } from '../api/financeApi'

export const useCashFlow = (query: CashFlowQuery) =>
  useQuery({
    queryKey: ['finance', 'cash-flow', query],
    queryFn: () => listCashFlow(query),
  })
