import type { CatalogListParams, CatalogSummaryParams } from './catalogApi'

export const catalogKeys = {
  all: ['portal', 'catalog'] as const,
  list: (params: CatalogListParams) => [...catalogKeys.all, 'list', params] as const,
  summary: (params: CatalogSummaryParams) => [...catalogKeys.all, 'summary', params] as const,
  detail: (id: string) => [...catalogKeys.all, 'detail', id] as const,
  variants: (listingId: string) => [...catalogKeys.all, 'variants', listingId] as const,
  options: () => [...catalogKeys.all, 'listing-options'] as const,
  productTypes: (params: object) => [...catalogKeys.all, 'product-types', params] as const,
  templates: (params: object) => [...catalogKeys.all, 'templates', params] as const,
  template: (id: string) => [...catalogKeys.all, 'template', id] as const,
}
