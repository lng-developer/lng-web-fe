import { describe, expect, it } from 'vitest'

import {
  getMappingRulePage,
  getRulePageForFixType,
  MAPPING_RULE_PAGES,
  safeMappingReturnTo,
} from '@/features/portal/mapping/model/mappingPageConfig'

describe('mappingPageConfig', () => {
  it('maps each focused page to exactly one rule type', () => {
    expect(MAPPING_RULE_PAGES).toHaveLength(5)
    expect(getMappingRulePage('product-mapping').ruleType).toBe('skuConfig')
    expect(getRulePageForFixType('CREATE_SKU_CONFIG_RULE')?.path).toBe('product-mapping')
    expect(getRulePageForFixType('SKU_CONFIG')?.path).toBe('product-mapping')
  })

  it('accepts only internal mapping return paths', () => {
    expect(safeMappingReturnTo('/portal/mapping/workbench')).toBe('/portal/mapping/workbench')
    expect(safeMappingReturnTo('/portal/orders')).toBe('/portal/mapping?tab=workbench')
    expect(safeMappingReturnTo('https://evil.example')).toBe('/portal/mapping?tab=workbench')
  })
})
