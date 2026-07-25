import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { MAPPING_RULE_FORM_CONFIG, STATIC_OPTIONS } from '../data/mappingUxConfig.js'
import {
  buildRuleConflictPayload,
  buildRuleEvaluationPayload,
  createMappingRuleSchema,
  getServerFieldErrors,
} from '../hooks/useMappingRuleForm.js'

const componentSource = (name) => readFileSync(new URL(`./${name}.jsx`, import.meta.url), 'utf8')

test('sku normalize validation requires appliesWhenValues and replacement only for replace', () => {
  const schema = createMappingRuleSchema('skuNormalize')
  const baseValues = {
    appliesWhenValues: 'US',
    marketplaceCode: 'AMAZON_US',
    outputAction: 'REMOVE_SEGMENT',
    patternType: 'SEGMENT',
    priority: '100',
    salesChannelCode: 'AMAZON',
    segmentIndex: '2',
    segmentRole: 'COUNTRY',
    shopId: '507f1f77bcf86cd799439011',
    status: 'ACTIVE',
  }

  assert.equal(schema.safeParse(baseValues).success, true)
  assert.equal(
    schema.safeParse({ ...baseValues, appliesWhenValues: '' }).error.issues[0].path[0],
    'appliesWhenValues',
  )
  assert.equal(
    schema.safeParse({
      ...baseValues,
      outputAction: 'REPLACE_SEGMENT',
      replacementValue: '',
    }).error.issues[0].path[0],
    'replacementValue',
  )
})

test('evaluation payload contains only configured backend fields and capped samples', () => {
  const payload = buildRuleEvaluationPayload('valueAliases', {
    ignoredTechnicalField: 'do-not-send',
    marketplaceCode: 'AMAZON_US',
    matchType: 'EXACT',
    matchValue: ' XXL ',
    priority: '100',
    salesChannelCode: 'AMAZON',
    shopId: '507f1f77bcf86cd799439011',
    samples: Array.from({ length: 12 }, (_, index) => ` sample-${index + 1} `).join('\n'),
    semanticRole: 'SIZE',
    status: 'ACTIVE',
    normalizedValue: ' 2XL ',
  })

  assert.deepEqual(payload.rule, {
    shopId: '507f1f77bcf86cd799439011',
    salesChannelCode: 'AMAZON',
    marketplaceCode: 'AMAZON_US',
    semanticRole: 'SIZE',
    matchValue: 'XXL',
    normalizedValue: '2XL',
    matchType: 'EXACT',
    priority: 100,
    status: 'ACTIVE',
  })
  assert.equal(payload.samples.length, 10)
  assert.equal(Object.hasOwn(payload.rule, 'ignoredTechnicalField'), false)
})

test('conflict payload includes the edited rule id and its complete evaluator payload', () => {
  const payload = buildRuleConflictPayload(
    'skuNormalize',
    {
      appliesWhenValues: 'US',
      marketplaceCode: 'AMAZON_US',
      outputAction: 'REMOVE_SEGMENT',
      patternType: 'SEGMENT',
      salesChannelCode: 'AMAZON',
      segmentIndex: '2',
      segmentRole: 'COUNTRY',
      shopId: '507f1f77bcf86cd799439011',
    },
    '507f1f77bcf86cd799439012',
  )

  assert.equal(payload.ruleId, '507f1f77bcf86cd799439012')
  assert.equal(payload.rule.shopId, '507f1f77bcf86cd799439011')
  assert.equal(payload.ruleType, 'skuNormalize')
})

test('remove action never submits a stale replacement value', () => {
  const values = {
    appliesWhenValues: 'TS1S',
    outputAction: 'REPLACE_SEGMENT',
    patternType: 'SEGMENT',
    replacementValue: 'TS2S',
    segmentIndex: '1',
    segmentRole: 'CONFIG',
  }

  assert.equal(buildRuleEvaluationPayload('skuNormalize', values).rule.replacementValue, 'TS2S')
  assert.equal(
    Object.hasOwn(
      buildRuleEvaluationPayload('skuNormalize', {
        ...values,
        outputAction: 'REMOVE_SEGMENT',
      }).rule,
      'replacementValue',
    ),
    false,
  )
})

test('server validation details map rule paths back to fields', () => {
  assert.deepEqual(
    getServerFieldErrors({
      data: {
        error: {
          details: [
            {
              message: '"rule.replacementValue" is required',
              path: ['rule', 'replacementValue'],
            },
          ],
        },
      },
    }),
    [{ field: 'replacementValue', message: '"rule.replacementValue" is required' }],
  )
})

test('form metadata and components stay within the four server-evaluated rule types', () => {
  const supportedTypes = ['skuNormalize', 'skuConfig', 'semanticRules', 'valueAliases']
  const configuredTypes = supportedTypes.filter((type) => MAPPING_RULE_FORM_CONFIG[type])

  assert.deepEqual(configuredTypes, supportedTypes)
  assert.equal(
    MAPPING_RULE_FORM_CONFIG.skuNormalize.fields.find(
      ({ payloadKey }) => payloadKey === 'appliesWhenValues',
    ).required,
    true,
  )
  assert.deepEqual(
    STATIC_OPTIONS.segmentRole.map(({ value }) => value),
    ['EMPLOYEE', 'SIZE', 'COLOR', 'CONFIG', 'COUNTRY', 'OTHER'],
  )
  assert.equal(
    MAPPING_RULE_FORM_CONFIG.semanticRules.fields.find(
      ({ payloadKey }) => payloadKey === 'matchType',
    ).defaultValue,
    'CONTAINS',
  )
  for (const type of supportedTypes) {
    const shopField = MAPPING_RULE_FORM_CONFIG[type].fields.find(
      ({ payloadKey }) => payloadKey === 'shopId',
    )
    assert.equal(shopField?.optionSource, 'shops')
    assert.equal(shopField?.required, true)
  }

  for (const name of [
    'MappingRuleDialog',
    'SkuNormalizeRuleForm',
    'SkuConfigRuleForm',
    'SemanticRuleForm',
    'ValueAliasForm',
    'RuleEvaluationPanel',
  ]) {
    assert.doesNotMatch(componentSource(name), /axios|apiClient|\/api\/mapping/)
  }
})

test('dialog composes all rule forms and replacement input unregisters when hidden', () => {
  const dialog = componentSource('MappingRuleDialog')
  const renderer = componentSource('ConfiguredMappingRuleForm')
  const hook = readFileSync(new URL('../hooks/useMappingRuleForm.js', import.meta.url), 'utf8')

  for (const name of [
    'SemanticRuleForm',
    'SkuConfigRuleForm',
    'SkuNormalizeRuleForm',
    'ValueAliasForm',
    'RuleEvaluationPanel',
  ]) {
    assert.match(dialog, new RegExp(`import ${name}`))
  }
  for (const name of [
    'SemanticRuleForm',
    'SkuConfigRuleForm',
    'SkuNormalizeRuleForm',
    'ValueAliasForm',
  ]) {
    assert.match(componentSource(name), /useMappingRulePreviewChange/)
  }
  assert.match(hook, /shouldUnregister:\s*true/)
  assert.match(renderer, /required=\{required\}/)
  assert.match(renderer, /'aria-required': required/)
  assert.match(renderer, /outputAction === 'REPLACE_SEGMENT'/)
})
