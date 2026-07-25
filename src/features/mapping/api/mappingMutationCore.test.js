import assert from 'node:assert/strict'
import test from 'node:test'

import { getMappingRuleSaveBody } from './mappingMutationCore.js'

test('create preserves shop scope while edit omits immutable shop scope', () => {
  const body = { matchValue: 'Size', shopId: '507f1f77bcf86cd799439011', status: 'ACTIVE' }

  assert.deepEqual(getMappingRuleSaveBody(body), body)
  assert.deepEqual(getMappingRuleSaveBody(body, '507f1f77bcf86cd799439012'), {
    matchValue: 'Size',
    status: 'ACTIVE',
  })
})
