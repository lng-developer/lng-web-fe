import { useQuery } from '@tanstack/react-query'

import { modalQueryOptions } from '@/shared/query/modalQuery'

import {
  getMappingSummary,
  listAuthorableShops,
  listMappingRuleHistory,
  listMappingRules,
  listUnmatchedItems,
  type MappingContextParams,
  type MappingRuleType,
  previewOrderItem,
  type RuleListParams,
  searchVendorCandidates,
  type UnmatchedParams,
} from '../api/mappingApi'
import { mappingKeys } from '../api/mappingKeys'

export function useMappingSummaryQuery(
  params: MappingContextParams = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: mappingKeys.summaryRoot(),
    queryFn: () => getMappingSummary(params),
    retry: false,
    staleTime: 30_000,
    ...options,
  })
}

export function useAuthorableShopsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: mappingKeys.shops(),
    queryFn: listAuthorableShops,
    retry: false,
    staleTime: 60_000,
    ...options,
  })
}

export function useUnmatchedItemsQuery(params: UnmatchedParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: mappingKeys.unmatched(params),
    queryFn: () => listUnmatchedItems(params),
    retry: false,
    ...options,
  })
}

export function useOrderItemPreviewQuery(orderItemId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: mappingKeys.preview(orderItemId ?? ''),
    queryFn: () => previewOrderItem(orderItemId!),
    enabled: Boolean(orderItemId) && (options?.enabled ?? true),
    retry: false,
    ...options,
  })
}

export function useVendorCandidatesQuery(
  orderItemId?: string,
  search = '',
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: mappingKeys.candidates(orderItemId ?? '', search),
    queryFn: () =>
      searchVendorCandidates(orderItemId!, { q: search, includeTotal: false, limit: 100 }),
    enabled: Boolean(orderItemId) && (options?.enabled ?? true),
    retry: false,
    ...options,
  })
}

export function useMappingRulesQuery(
  type: MappingRuleType,
  params: RuleListParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: mappingKeys.rules(type, params),
    queryFn: () => listMappingRules(type, params),
    retry: false,
    ...options,
  })
}

export function useRuleHistoryQuery(
  type: MappingRuleType,
  id?: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: mappingKeys.history(type, id ?? ''),
    queryFn: () => listMappingRuleHistory(type, id!),
    ...modalQueryOptions,
    enabled: Boolean(id) && (options?.enabled ?? true),
    retry: false,
    ...options,
  })
}
