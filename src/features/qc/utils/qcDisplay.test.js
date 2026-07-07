import assert from 'node:assert/strict'
import test from 'node:test'

import { getDefaultQcExpandedTaskId } from './qcDisplay.js'

test('getDefaultQcExpandedTaskId keeps QC rows collapsed by default', () => {
  assert.equal(getDefaultQcExpandedTaskId(), null)
})
