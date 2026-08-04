import { describe, expect, it } from 'vitest'

import type { MappingPreview } from '@/features/portal/mapping/api/mappingApi'
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

  it('adapts the fulfillment preview DTO into selectable trace candidates', () => {
    const trace = toMappingTraceView({
      ready: true,
      normalizedInputs: [
        { semanticRole: 'SIZE', value: '36X72', originalLabel: 'Choose Size', source: 'RULE' },
      ],
      vendorProductCandidates: [
        {
          id: 'product-1',
          name: 'Rectangle Fence Flag',
          vendor: { name: 'Merchize' },
        },
      ],
      costCenterCandidates: [
        {
          id: 'cost-center-1',
          vendorProductId: 'product-1',
          code: 'RFFLVN_36X72',
          name: '36x72',
          standardSize: '36x72',
          confidence: 'HIGH',
        },
      ],
    } as unknown as MappingPreview)

    expect(trace.normalizedInputs[0]).toMatchObject({
      label: 'Choose Size',
      normalizedValue: '36X72',
    })
    expect(trace.candidates).toEqual([
      expect.objectContaining({
        vendorCostCenterId: 'cost-center-1',
        vendorProductId: 'product-1',
        vendorProductName: 'Rectangle Fence Flag',
        vendorName: 'Merchize',
        size: '36x72',
      }),
    ])
  })
})
