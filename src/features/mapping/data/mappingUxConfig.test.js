import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildMappingRuleInitialValues,
  buildMappingRulePayload,
  buildMappingRulePreview,
  MAPPING_RULE_FORM_CONFIG,
  TAB_GUIDES,
} from './mappingUxConfig.js'

test('mapping tabs expose short operator guidance', () => {
  assert.match(TAB_GUIDES.resolve.description, /blocked order items/i)
  assert.match(TAB_GUIDES.valueAliases.description, /XXL/i)
  assert.match(TAB_GUIDES.vendorRouting.primaryAction, /vendor/i)
})

test('rule form config uses operator labels instead of raw API field names', () => {
  const valueAliasMainLabels = MAPPING_RULE_FORM_CONFIG.valueAliases.fields
    .filter((field) => !field.advanced)
    .map((field) => field.label)

  assert.deepEqual(valueAliasMainLabels, ['Value group', 'Customer value', 'Standard value'])
  assert.equal(valueAliasMainLabels.includes('matchValue'), false)
  assert.equal(valueAliasMainLabels.includes('normalizedValue'), false)
})

test('rule form config keeps defaults and optional scope in advanced fields', () => {
  const valueAliasAdvancedLabels = MAPPING_RULE_FORM_CONFIG.valueAliases.fields
    .filter((field) => field.advanced)
    .map((field) => field.label)

  assert.deepEqual(valueAliasAdvancedLabels, [
    'Sales channel',
    'Marketplace',
    'Matching method',
    'Priority',
    'Status',
  ])
})

test('rule form config includes short how-to-fill guidance', () => {
  assert.match(MAPPING_RULE_FORM_CONFIG.valueAliases.howToFill.join(' '), /Customer value/i)
  assert.match(MAPPING_RULE_FORM_CONFIG.skuConfig.howToFill.join(' '), /SKU config code/i)
})

test('buildMappingRuleInitialValues converts arrays to comma text for editing', () => {
  const values = buildMappingRuleInitialValues('skuConfig', {
    productTypeAliases: ['UNISEX T-SHIRT', 'UNISEX TSHIRT'],
    priority: 80,
    status: 'ACTIVE',
  })

  assert.equal(values.productTypeAliases, 'UNISEX T-SHIRT, UNISEX TSHIRT')
  assert.equal(values.priority, '80')
  assert.equal(values.status, 'ACTIVE')
})

test('buildMappingRulePayload keeps only configured fields and normalizes numbers and lists', () => {
  const payload = buildMappingRulePayload('valueAliases', {
    ignoredTechnicalField: 'do-not-send',
    marketplaceCode: 'AMAZON_US',
    matchType: 'EXACT',
    matchValue: 'XXL',
    normalizedValue: '2XL',
    priority: '100',
    salesChannelCode: 'AMAZON',
    semanticRole: 'SIZE',
    shopId: '',
    status: 'ACTIVE',
  })

  assert.deepEqual(payload, {
    marketplaceCode: 'AMAZON_US',
    matchType: 'EXACT',
    matchValue: 'XXL',
    normalizedValue: '2XL',
    priority: 100,
    salesChannelCode: 'AMAZON',
    semanticRole: 'SIZE',
    status: 'ACTIVE',
  })
})

test('buildMappingRulePreview explains a value alias without raw API field names', () => {
  const preview = buildMappingRulePreview(
    'valueAliases',
    {
      marketplaceCode: 'AMAZON_US',
      matchValue: 'XXL',
      normalizedValue: '2XL',
      salesChannelCode: 'AMAZON',
      semanticRole: 'SIZE',
    },
    {
      marketplaceCode: { AMAZON_US: 'Amazon US' },
      salesChannelCode: { AMAZON: 'Amazon' },
      semanticRole: { SIZE: 'Size' },
    },
  )

  assert.equal(preview.title, 'Preview')
  assert.match(preview.description, /customer value "XXL" for Size/i)
  assert.match(preview.description, /use "2XL"/i)
  assert.equal(preview.description.includes('matchValue'), false)
  assert.equal(preview.description.includes('normalizedValue'), false)
  assert.deepEqual(preview.changes, [{ after: '2XL', before: 'XXL', label: 'Size' }])
})

test('buildMappingRulePreview shows only the SKU segment affected by the rule', () => {
  const preview = buildMappingRulePreview('skuNormalize', {
    appliesWhenValues: 'J2510',
    configCode: 'TS2S',
    marketplaceCode: 'AMAZON_US',
    outputAction: 'REPLACE_SEGMENT',
    replacementValue: 'J2512',
    salesChannelCode: 'AMAZON',
    segmentIndex: '0',
    segmentRole: 'CONFIG',
  })

  assert.deepEqual(preview.changes[0], {
    after: 'J2512',
    before: 'J2510',
    label: 'SKU segment 1',
  })
})
