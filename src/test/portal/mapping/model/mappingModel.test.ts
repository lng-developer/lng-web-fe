import { describe, expect, it } from 'vitest'

import {
  getRuleTypeForStage,
  getStageForFixType,
  toMappingTraceView,
} from '@/features/portal/mapping/model/mappingModel'

describe('mappingModel', () => {
  it('maps every pipeline stage to its backend rule alias', () => {
    expect(getRuleTypeForStage('SKU_CLEANUP')).toBe('skuNormalize')
    expect(getRuleTypeForStage('PRODUCT_MAPPING')).toBe('skuConfig')
    expect(getRuleTypeForStage('INPUT_SEMANTICS')).toBe('semanticRules')
    expect(getRuleTypeForStage('VALUE_ALIASES')).toBe('valueAliases')
    expect(getRuleTypeForStage('VENDOR_ROUTING')).toBe('vendorRouting')
  })

  it('maps recommendations to the stage that can resolve them', () => {
    expect(getStageForFixType('CREATE_SKU_CONFIG_RULE')).toBe('PRODUCT_MAPPING')
    expect(getStageForFixType('CREATE_VENDOR_ROUTING_RULE')).toBe('VENDOR_ROUTING')
    expect(getStageForFixType('UNKNOWN')).toBeUndefined()
  })

  it('normalizes preview evidence and labels impact as sampled', () => {
    expect(
      toMappingTraceView({
        ready: false,
        blockingReasons: ['NO_VENDOR_COST_CENTER_CANDIDATE'],
        skuNormalization: { originalSku: 'A-US', canonicalSku: 'A' },
        skuMapping: { configCode: 'A' },
        normalizedInputs: [],
        costCenterCandidates: [],
      }).impactLabel,
    ).toBe('SAMPLED')
  })
})
