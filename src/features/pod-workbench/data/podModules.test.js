import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { POD_MODULE_IDS, POD_MODULES } from './podModules.js'

describe('POD module config', () => {
  it('keeps each module wired to a primary API endpoint and visible contracts', () => {
    assert.deepEqual(POD_MODULE_IDS, [
      'catalog',
      'vendors',
      'mapping',
      'orders',
      'design',
      'production',
      'logistics',
      'finance',
    ])

    for (const moduleId of POD_MODULE_IDS) {
      assert.match(POD_MODULES[moduleId].primaryEndpoint, /^\/api\//)
      assert.ok(POD_MODULES[moduleId].contracts.length > 0)
      assert.ok(POD_MODULES[moduleId].rows.length > 0)
    }
  })
})
