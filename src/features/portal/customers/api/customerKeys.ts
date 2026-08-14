import type { CustomerListParams } from './customerApi'

export const customerKeys = {
  all: ['customers'] as const,
  list: (params: CustomerListParams) => [...customerKeys.all, 'list', params] as const,
  summary: (params: Partial<CustomerListParams>) =>
    [...customerKeys.all, 'summary', params] as const,
  detail: (customerId: string) => [...customerKeys.all, 'detail', customerId] as const,
  timeline: (customerId: string) => [...customerKeys.all, 'timeline', customerId] as const,
}
