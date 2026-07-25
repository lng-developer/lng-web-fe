import assert from 'node:assert/strict'
import test from 'node:test'

import { getMappingRuleSaveBody, requestMappingAuthorableShops } from './mappingMutationCore.js'

test('create preserves shop scope while edit omits immutable shop scope', () => {
  const body = { matchValue: 'Size', shopId: '507f1f77bcf86cd799439011', status: 'ACTIVE' }

  assert.deepEqual(getMappingRuleSaveBody(body), body)
  assert.deepEqual(getMappingRuleSaveBody(body, '507f1f77bcf86cd799439012'), {
    matchValue: 'Size',
    status: 'ACTIVE',
  })
})

test('authorable shops request uses the Mapping-owned endpoint and unwraps its contract', async () => {
  const response = {
    success: true,
    data: {
      canCreateGlobal: false,
      items: [{ id: '507f1f77bcf86cd799439011', name: 'Alpha Shop' }],
    },
  }
  const calls = []
  const client = {
    get: async (path) => {
      calls.push(path)
      return response
    },
  }

  const result = await requestMappingAuthorableShops(client, (payload) => payload.data)

  assert.deepEqual(calls, ['/api/mapping/authorable-shops'])
  assert.deepEqual(result, response.data)
})
