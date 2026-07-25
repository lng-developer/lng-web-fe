import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { MAPPING_RULE_FORM_CONFIG, STATIC_OPTIONS } from '../data/mappingUxConfig.js'
import {
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
    samples: Array.from({ length: 12 }, (_, index) => ` sample-${index + 1} `).join('\n'),
    semanticRole: 'SIZE',
    status: 'ACTIVE',
    normalizedValue: ' 2XL ',
  })

  assert.deepEqual(payload.rule, {
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
