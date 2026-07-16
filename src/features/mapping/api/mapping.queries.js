import { useQuery } from '@tanstack/react-query'

import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import { mappingKeys } from './mapping.keys'

export const mappingRuleTypes = [
  {
    id: 'skuNormalize',
    label: 'SKU Normalize',
    listEndpoint: ENDPOINTS.MAPPING.SKU_NORMALIZE_RULES,
    detailEndpoint: ENDPOINTS.MAPPING.SKU_NORMALIZE_RULE,
  },
  {
    id: 'skuConfig',
    label: 'SKU Config',
    listEndpoint: ENDPOINTS.MAPPING.SKU_CONFIG_RULES,
    detailEndpoint: ENDPOINTS.MAPPING.SKU_CONFIG_RULE,
  },
  {
    id: 'semanticRules',
    label: 'Semantic Rules',
    listEndpoint: ENDPOINTS.MAPPING.SEMANTIC_RULES,
    detailEndpoint: ENDPOINTS.MAPPING.SEMANTIC_RULE,
  },
  {
    id: 'valueAliases',
    label: 'Value Aliases',
    listEndpoint: ENDPOINTS.MAPPING.VALUE_ALIASES,
    detailEndpoint: ENDPOINTS.MAPPING.VALUE_ALIAS,
  },
  {
    id: 'vendorRouting',
    label: 'Vendor Routing',
    listEndpoint: ENDPOINTS.MAPPING.VENDOR_ROUTING_RULES,
    detailEndpoint: ENDPOINTS.MAPPING.VENDOR_ROUTING_RULE,
  },
]

export function unwrapApiData(response) {
  return response?.success && Object.hasOwn(response, 'data') ? response.data : response
}

function get(path, query) {
  return apiClient.get(path, { params: query }).then(unwrapApiData)
}

export function getMappingRuleType(type) {
  return mappingRuleTypes.find((ruleType) => ruleType.id === type) || mappingRuleTypes[0]
}

export function useMappingWorkbenchQuery(query = {}, options = {}) {
  return useQuery({
    queryKey: mappingKeys.workbench(query),
    queryFn: () => get(ENDPOINTS.MAPPING.CONFIG_WORKBENCH, query),
    keepPreviousData: true,
    ...options,
  })
}

export function useMappingRulesQuery(type, query = {}, options = {}) {
  const ruleType = getMappingRuleType(type)

  return useQuery({
    queryKey: mappingKeys.rules(ruleType.id, query),
    queryFn: () => get(ruleType.listEndpoint, query),
    keepPreviousData: true,
    ...options,
  })
}

export function useMappingInternalTemplatesQuery(query = {}, options = {}) {
  return useQuery({
    queryKey: mappingKeys.internalTemplates(query),
    queryFn: () => get(ENDPOINTS.CATALOG.INTERNAL_TEMPLATES, query),
    keepPreviousData: true,
    retry: false,
    ...options,
  })
}

export function useMappingPlanQuery(orderItemId, options = {}) {
  return useQuery({
    queryKey: mappingKeys.plan(orderItemId),
    queryFn: () => get(ENDPOINTS.MAPPING.ORDER_ITEM_PLAN(orderItemId)),
    enabled: Boolean(orderItemId),
    ...options,
  })
}
