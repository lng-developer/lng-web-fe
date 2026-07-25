import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getMappingFlowInvalidationKeys,
  getMappingRuleInvalidationKeys,
} from './mappingInvalidation.js'
import {
  invalidateMappingMutation,
  requestMappingRuleConflicts,
  requestMappingRuleHistory,
  requestMappingRulePreview,
  requestMappingVendorCandidates,
  requestMappingVendorRoutingReorder,
} from './mappingMutationCore.js'

function unwrap(response) {
  return response?.success ? response.data : response
}

function createApiClient() {
  const calls = []
  return {
    calls,
    get(path) {
      calls.push({ method: 'get', path })
      return Promise.resolve({ success: true, data: { items: [] } })
    },
    patch(path, body) {
      calls.push({ body, method: 'patch', path })
      return Promise.resolve({ success: true, data: { id: 'rule-1' } })
    },
    post(path, body) {
      calls.push({ body, method: 'post', path })
      return Promise.resolve({ success: true, data: { ok: true } })
    },
  }
}

test('mapping write actions refresh mapping, orders, and production flow data', () => {
  assert.deepEqual(getMappingFlowInvalidationKeys('order-item-1'), [
    ['mapping'],
    ['orders'],
    ['orders', 'items', 'order-item-1', 'readiness'],
    ['production'],
    ['production', 'order-item', 'order-item-1'],
  ])
})

test('vendor routing reorder request sends the backend body directly', async () => {
  const client = createApiClient()
  const body = { vendorRanks: [{ vendorId: 'vendor-1', priority: 1 }] }

  await requestMappingVendorRoutingReorder(client, unwrap, body)

  assert.deepEqual(client.calls, [
    {
      body,
      method: 'patch',
      path: '/api/mapping/vendor-routing-rules/reorder',
    },
  ])
})

test('vendor candidate request calls the order item candidate endpoint', async () => {
  const client = createApiClient()
  const body = { query: 'BeeFul' }

  await requestMappingVendorCandidates(client, unwrap, {
    body,
    orderItemId: 'order-item-1',
  })

  assert.deepEqual(client.calls, [
    {
      body,
      method: 'post',
      path: '/api/mapping/order-items/order-item-1/vendor-candidates/search',
    },
  ])
})

test('rule write success invalidates the active rule family and exact history', () => {
  const calls = []
  const queryClient = {
    invalidateQueries(options) {
      calls.push(options)
    },
  }

  invalidateMappingMutation(
    queryClient,
    { id: 'rule-1' },
    { type: 'valueAliases' },
    {
      refreshRuleType: true,
    },
  )

  assert.deepEqual(getMappingRuleInvalidationKeys('valueAliases', 'rule-1'), [
    ['mapping', 'rules', 'valueAliases'],
    ['mapping', 'rules', 'valueAliases', 'rule-1', 'history'],
  ])
  assert.deepEqual(calls, [
    { queryKey: ['mapping', 'rules', 'valueAliases'] },
    { queryKey: ['mapping', 'rules', 'valueAliases', 'rule-1', 'history'] },
  ])
})

test('rule evaluation requests call centralized endpoints and unwrap responses', async () => {
  const client = createApiClient()
  const payload = {
    ruleType: 'valueAliases',
    rule: { matchValue: 'XXL', normalizedValue: '2XL' },
    samples: ['XXL'],
  }

  const preview = await requestMappingRulePreview(client, unwrap, payload)
  const conflicts = await requestMappingRuleConflicts(client, unwrap, payload)

  assert.deepEqual(preview, { ok: true })
  assert.deepEqual(conflicts, { ok: true })
  assert.deepEqual(client.calls, [
    { body: payload, method: 'post', path: '/api/mapping/rule-preview' },
    { body: payload, method: 'post', path: '/api/mapping/rule-conflicts' },
  ])
})

test('rule history request calls the typed history endpoint and unwraps items', async () => {
  const client = createApiClient()

  const history = await requestMappingRuleHistory(client, unwrap, 'valueAliases', 'rule-1')

  assert.deepEqual(history, { items: [] })
  assert.deepEqual(client.calls, [
    {
      method: 'get',
      path: '/api/mapping/valueAliases/rule-1/history',
    },
  ])
})
