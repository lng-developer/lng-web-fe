import assert from 'node:assert/strict'
import test from 'node:test'

import { mapMappingPreview, mapMappingRuleRows, mapMappingWorkbenchRows } from './mappingMappers.js'

test('mapMappingWorkbenchRows exposes operator fields without raw ids as labels', () => {
  const rows = mapMappingWorkbenchRows({
    recentUnmatchedOrderItemSamples: [
      {
        orderItemId: 'item-1',
        externalOrderId: '113-000',
        title: 'Personalized Tee',
        skuNormalization: {
          originalSku: 'J2508-TS1S-25022026-666',
          canonicalSku: 'J2508-TS2S-25022026-666',
        },
        skuMapping: { configCode: 'TS2S' },
        blockingReasons: ['NO_VENDOR_COST_CENTER_CANDIDATE'],
        recommendedFixTypes: ['VENDOR_COST_CENTER'],
        normalizedInputs: [{ role: 'SIZE', value: 'XXL', normalizedValue: '2XL' }],
      },
    ],
  })

  assert.deepEqual(rows[0], {
    id: 'item-1',
    orderLabel: '113-000',
    itemLabel: 'Personalized Tee',
    originalSku: 'J2508-TS1S-25022026-666',
    canonicalSku: 'J2508-TS2S-25022026-666',
    configCode: 'TS2S',
    blockingReasons: ['NO_VENDOR_COST_CENTER_CANDIDATE'],
    recommendedFixes: ['VENDOR_COST_CENTER'],
    normalizedInputs: ['SIZE: XXL -> 2XL'],
    vendorCandidateCount: 0,
    costCenterCandidateCount: 0,
    planStatus: '-',
    raw: {
      orderItemId: 'item-1',
      externalOrderId: '113-000',
      title: 'Personalized Tee',
      skuNormalization: {
        originalSku: 'J2508-TS1S-25022026-666',
        canonicalSku: 'J2508-TS2S-25022026-666',
      },
      skuMapping: { configCode: 'TS2S' },
      blockingReasons: ['NO_VENDOR_COST_CENTER_CANDIDATE'],
      recommendedFixTypes: ['VENDOR_COST_CENTER'],
      normalizedInputs: [{ role: 'SIZE', value: 'XXL', normalizedValue: '2XL' }],
    },
  })
})

test('mapMappingPreview summarizes readiness, SKU, inputs, candidates, and auto match', () => {
  const preview = mapMappingPreview({
    ready: true,
    skuNormalization: {
      originalSku: 'RAW-SKU',
      canonicalSku: 'CANON-SKU',
    },
    skuMapping: { configCode: 'TS2S' },
    normalizedInputs: [{ semanticRole: 'COLOR', value: 'Navy', normalizedValue: 'NAVY' }],
    vendorProductCandidates: [{ id: 'vp-1', name: 'DTG Shirt', vendor: { name: 'Vendor A' } }],
    costCenterCandidates: [
      {
        id: 'cc-1',
        vendorProductId: 'vp-1',
        name: '2XL print',
        totalCost: 6.25,
        currency: 'USD',
      },
    ],
    autoMatch: { vendorProductId: 'vp-1', vendorCostCenterId: 'cc-1' },
  })

  assert.equal(preview.ready, true)
  assert.equal(preview.originalSku, 'RAW-SKU')
  assert.equal(preview.canonicalSku, 'CANON-SKU')
  assert.equal(preview.configCode, 'TS2S')
  assert.deepEqual(preview.normalizedInputs, ['COLOR: Navy -> NAVY'])
  assert.equal(preview.vendorCandidates[0].label, 'Vendor A / DTG Shirt')
  assert.equal(preview.costCenterCandidates[0].label, '2XL print - 6.25 USD')
  assert.deepEqual(preview.autoMatch, {
    vendorCostCenterId: 'cc-1',
    vendorProductId: 'vp-1',
  })
})

test('mapMappingRuleRows builds readable rule rows by rule type', () => {
  const rows = mapMappingRuleRows('valueAliases', {
    items: [
      {
        _id: 'rule-1',
        semanticRole: 'SIZE',
        matchValue: 'XXL',
        normalizedValue: '2XL',
        priority: 100,
        status: 'ACTIVE',
      },
    ],
  })

  assert.deepEqual(rows[0], {
    id: 'rule-1',
    label: 'SIZE',
    match: 'XXL',
    output: '2XL',
    priority: 100,
    scope: 'Global',
    status: 'ACTIVE',
    raw: {
      _id: 'rule-1',
      semanticRole: 'SIZE',
      matchValue: 'XXL',
      normalizedValue: '2XL',
      priority: 100,
      status: 'ACTIVE',
    },
    type: 'valueAliases',
  })
})

test('mapMappingRuleRows does not expose raw ids as user-facing labels', () => {
  const rows = mapMappingRuleRows('vendorRouting', {
    items: [
      {
        _id: '671111111111111111111111',
        productTypeGroupId: '672222222222222222222222',
        shopId: '673333333333333333333333',
        status: 'ACTIVE',
        vendorId: '674444444444444444444444',
      },
    ],
  })

  assert.equal(rows[0].label, 'Vendor routing rule')
  assert.equal(rows[0].match, '-')
  assert.equal(rows[0].output, 'Preferred vendor')
  assert.equal(rows[0].scope, 'Scoped shop')
})

test('mapMappingRuleRows uses compact backend references instead of raw ids', () => {
  const rows = mapMappingRuleRows('vendorRouting', {
    items: [
      {
        _id: '671111111111111111111111',
        productTypeGroup: { id: '672222222222222222222222', code: 'TSHIRT', name: 'T-Shirt' },
        shop: { id: '673333333333333333333333', name: 'Main Amazon Shop' },
        status: 'ACTIVE',
        vendor: { id: '674444444444444444444444', code: 'BEEFUL', name: 'BeeFul' },
      },
    ],
  })

  assert.equal(rows[0].label, 'T-Shirt')
  assert.equal(rows[0].output, 'BeeFul')
  assert.equal(rows[0].scope, 'Main Amazon Shop')
})
