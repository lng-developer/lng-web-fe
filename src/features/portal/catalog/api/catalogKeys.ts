import type { CatalogListParams, CatalogSummaryParams } from './catalogApi'

export const catalogKeys = {
  all: ['portal', 'catalog'] as const,
  list: (params: CatalogListParams) => [...catalogKeys.all, 'list', params] as const,
  summary: (params: CatalogSummaryParams) => [...catalogKeys.all, 'summary', params] as const,
  detail: (id: string) => [...catalogKeys.all, 'detail', id] as const,
  options: () => [...catalogKeys.all, 'listing-options'] as const,
}
