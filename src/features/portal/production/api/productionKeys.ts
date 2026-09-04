import type { ProductionParams } from './productionApi'

export const productionKeys = {
  all: ['production'] as const,
  list: (params: ProductionParams) => [...productionKeys.all, 'list', params] as const,
  summary: (params: Omit<ProductionParams, 'page' | 'limit'>) =>
    [...productionKeys.all, 'summary', params] as const,
  queueSummary: (params: Pick<ProductionParams, 'search' | 'salesChannelCode'>) =>
    [...productionKeys.all, 'queue-summary', params] as const,
  detail: (id: string) => [...productionKeys.all, 'detail', id] as const,
}
