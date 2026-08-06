import type {
  MappingContextParams,
  MappingRuleType,
  RuleListParams,
  UnmatchedParams,
} from './mappingApi'

export const mappingKeys = {
  all: ['portal', 'mapping'] as const,
  summaryRoot: () => [...mappingKeys.all, 'summary'] as const,
  summary: (params: MappingContextParams) => [...mappingKeys.summaryRoot(), params] as const,
  workbench: (params: MappingContextParams) => [...mappingKeys.all, 'workbench', params] as const,
  shops: () => [...mappingKeys.all, 'authorable-shops'] as const,
  unmatchedRoot: () => [...mappingKeys.all, 'unmatched'] as const,
  unmatched: (params: UnmatchedParams) => [...mappingKeys.unmatchedRoot(), params] as const,
  preview: (orderItemId: string) => [...mappingKeys.all, 'preview', orderItemId] as const,
  candidates: (orderItemId: string, q: string) =>
    [...mappingKeys.all, 'candidates', orderItemId, q] as const,
  vendors: (q: string) => [...mappingKeys.all, 'manual-vendors', q] as const,
  vendorProducts: (vendorId: string, productTypeGroupId = '') =>
    [...mappingKeys.all, 'manual-products', vendorId, productTypeGroupId] as const,
  vendorProductOptions: (productId: string, size?: string, color?: string) =>
    [...mappingKeys.all, 'manual-options', productId, size, color] as const,
  rulesRoot: (type: MappingRuleType) => [...mappingKeys.all, 'rules', type] as const,
  rules: (type: MappingRuleType, params: RuleListParams) =>
    [...mappingKeys.rulesRoot(type), params] as const,
  history: (type: MappingRuleType, id: string) =>
    [...mappingKeys.rulesRoot(type), id, 'history'] as const,
}
