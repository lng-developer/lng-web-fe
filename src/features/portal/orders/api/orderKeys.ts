import { compactParams } from '@/shared/api/helpers'

import type { OrderWorkbenchParams } from './orderApi'

export const orderKeys = {
  all: ['orders'] as const,
  addressValidation: (orderId: string) =>
    [...orderKeys.all, 'address-validation', orderId] as const,
  workbench: (params: OrderWorkbenchParams) =>
    [...orderKeys.all, 'workbench', compactParams(params)] as const,
  workbenchSummary: (params: OrderWorkbenchParams) =>
    [...orderKeys.all, 'workbench', 'summary', compactParams(params)] as const,
  workbenchDetailLists: ['orders', 'workbench', 'details'] as const,
  workbenchDetails: (orderIds: readonly string[]) =>
    [...orderKeys.workbenchDetailLists, orderIds] as const,
  summary: (params: OrderWorkbenchParams) =>
    [...orderKeys.all, 'summary', compactParams(params)] as const,
  cases: (orderId: string) => [...orderKeys.all, 'cases', orderId] as const,
  caseDetail: (caseId: string) => [...orderKeys.all, 'case', caseId] as const,
  timeline: (orderId: string, orderItemId?: string) =>
    [...orderKeys.all, 'timeline', orderId, orderItemId ?? 'order'] as const,
}
