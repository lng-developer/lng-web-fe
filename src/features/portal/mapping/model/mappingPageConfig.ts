import type { MappingRuleType } from '../api/mappingApi'

export type MappingRulePageKey =
  | 'sku-rules'
  | 'product-mapping'
  | 'input-semantics'
  | 'value-aliases'
  | 'vendor-routing'

export type MappingRulePageConfig = {
  key: MappingRulePageKey
  path: MappingRulePageKey
  ruleType: MappingRuleType
  titleKey: string
  descriptionKey: string
}

export const MAPPING_RULE_PAGES: MappingRulePageConfig[] = [
  {
    key: 'sku-rules',
    path: 'sku-rules',
    ruleType: 'skuNormalize',
    titleKey: 'mapping.pages.skuRules',
    descriptionKey: 'mapping.pages.skuRulesDescription',
  },
  {
    key: 'product-mapping',
    path: 'product-mapping',
    ruleType: 'skuConfig',
    titleKey: 'mapping.pages.productMapping',
    descriptionKey: 'mapping.pages.productMappingDescription',
  },
  {
    key: 'input-semantics',
    path: 'input-semantics',
    ruleType: 'semanticRules',
    titleKey: 'mapping.pages.inputSemantics',
    descriptionKey: 'mapping.pages.inputSemanticsDescription',
  },
  {
    key: 'value-aliases',
    path: 'value-aliases',
    ruleType: 'valueAliases',
    titleKey: 'mapping.pages.valueAliases',
    descriptionKey: 'mapping.pages.valueAliasesDescription',
  },
  {
    key: 'vendor-routing',
    path: 'vendor-routing',
    ruleType: 'vendorRouting',
    titleKey: 'mapping.pages.vendorRouting',
    descriptionKey: 'mapping.pages.vendorRoutingDescription',
  },
]

const pagesByKey = new Map(MAPPING_RULE_PAGES.map((page) => [page.key, page]))
const fixPages: Record<string, MappingRulePageKey> = {
  CREATE_SKU_NORMALIZE_RULE: 'sku-rules',
  CREATE_SKU_CONFIG_RULE: 'product-mapping',
  SKU_CONFIG: 'product-mapping',
  CREATE_SEMANTIC_RULE: 'input-semantics',
  SEMANTIC_RULE: 'input-semantics',
  CREATE_VALUE_ALIAS: 'value-aliases',
  VALUE_ALIAS: 'value-aliases',
  CREATE_VENDOR_ROUTING_RULE: 'vendor-routing',
  VENDOR_PRODUCT: 'vendor-routing',
  VENDOR_COST_CENTER: 'vendor-routing',
}

export function getMappingRulePage(key: MappingRulePageKey) {
  return pagesByKey.get(key) as MappingRulePageConfig
}

export function getRulePageForFixType(fixType?: string) {
  return fixType ? pagesByKey.get(fixPages[fixType]) : undefined
}

export function safeMappingReturnTo(value?: string | null) {
  return value?.startsWith('/portal/mapping/') ? value : '/portal/mapping/workbench'
}
