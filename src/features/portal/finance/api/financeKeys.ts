import type { FinanceParams } from './financeApi'

export const financeKeys = {
  all: ['finance'] as const,
  snapshots: (params?: FinanceParams) =>
    params
      ? ([...financeKeys.all, 'snapshots', params] as const)
      : ([...financeKeys.all, 'snapshots'] as const),
  filterOptions: () => [...financeKeys.all, 'filter-options'] as const,
  orders: () => [...financeKeys.all, 'orders'] as const,
  orderDetail: (orderId: string) => [...financeKeys.all, 'orders', orderId] as const,
  orderItemDetail: (itemId: string) => [...financeKeys.all, 'order-items', itemId] as const,
  settlements: () => [...financeKeys.all, 'settlements'] as const,
  settlementDetail: (id: string) => [...financeKeys.all, 'settlements', id] as const,
  cashFlow: (params?: Record<string, unknown>) =>
    params
      ? ([...financeKeys.all, 'cash-flow', params] as const)
      : ([...financeKeys.all, 'cash-flow'] as const),
}
