import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { ENDPOINTS } from '../../../services/endpoints.js'
import {
  getMappingFlowInvalidationKeys,
  getMappingRuleInvalidationKeys,
} from './mappingInvalidation.js'

test('mapping write actions refresh mapping, orders, and production flow data', () => {
  assert.deepEqual(getMappingFlowInvalidationKeys('order-item-1'), [
    ['mapping'],
    ['orders'],
    ['orders', 'items', 'order-item-1', 'readiness'],
    ['production'],
    ['production', 'order-item', 'order-item-1'],
  ])
})

test('vendor routing reorder mutation sends backend reorder body directly', () => {
  const source = readFileSync(new URL('./mapping.mutations.js', import.meta.url), 'utf8')

  assert.equal(source.includes('orderedIds'), false)
  assert.equal(source.includes('patch(ENDPOINTS.MAPPING.VENDOR_ROUTING_REORDER, body)'), true)
})

test('vendor candidate search mutation calls mapping candidate search endpoint', () => {
  const source = readFileSync(new URL('./mapping.mutations.js', import.meta.url), 'utf8')

  assert.equal(source.includes('useMappingVendorCandidatesMutation'), true)
  assert.equal(
    source.includes('ENDPOINTS.MAPPING.ORDER_ITEM_VENDOR_CANDIDATES_SEARCH(orderItemId)'),
    true,
  )
})

test('rule writes invalidate only the active rule type', () => {
  const source = readFileSync(new URL('./mapping.mutations.js', import.meta.url), 'utf8')

  assert.deepEqual(getMappingRuleInvalidationKeys('valueAliases', 'rule-1'), [
    ['mapping', 'rules', 'valueAliases'],
    ['mapping', 'rules', 'valueAliases', 'rule-1', 'history'],
  ])
  assert.equal(source.includes('{ refreshRuleType: true }'), true)
})

test('rule evaluation mutations use centralized read-only endpoints', () => {
  const source = readFileSync(new URL('./mapping.mutations.js', import.meta.url), 'utf8')

  assert.equal(ENDPOINTS.MAPPING.RULE_PREVIEW, '/api/mapping/rule-preview')
  assert.equal(ENDPOINTS.MAPPING.RULE_CONFLICTS, '/api/mapping/rule-conflicts')
  assert.equal(source.includes('useMappingRulePreviewMutation'), true)
  assert.equal(source.includes('post(ENDPOINTS.MAPPING.RULE_PREVIEW, body)'), true)
  assert.equal(source.includes('useMappingRuleConflictsMutation'), true)
  assert.equal(source.includes('post(ENDPOINTS.MAPPING.RULE_CONFLICTS, body)'), true)
})

test('rule history uses the centralized endpoint and is wired into the inventory', () => {
  const querySource = readFileSync(new URL('./mapping.queries.js', import.meta.url), 'utf8')
  const inventorySource = readFileSync(
    new URL('../components/RuleInventoryWorkspace.jsx', import.meta.url),
    'utf8',
  )
  const historySource = readFileSync(
    new URL('../components/RuleHistoryDialog.jsx', import.meta.url),
    'utf8',
  )

  assert.equal(
    ENDPOINTS.MAPPING.RULE_HISTORY('valueAliases', 'rule-1'),
    '/api/mapping/valueAliases/rule-1/history',
  )
  assert.equal(querySource.includes('useMappingRuleHistoryQuery'), true)
  assert.equal(querySource.includes('ENDPOINTS.MAPPING.RULE_HISTORY(type, id)'), true)
  assert.equal(inventorySource.includes('<MappingRuleDialog'), true)
  assert.equal(inventorySource.includes('<RuleHistoryDialog'), true)
  assert.equal(historySource.includes('useMappingRuleHistoryQuery'), true)
  assert.equal(historySource.includes('mapMappingRuleHistory'), true)
  assert.equal(historySource.includes('actorAccountId'), false)
})
