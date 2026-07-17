import assert from 'node:assert/strict'
import test from 'node:test'

import { getOrderDetailDisplayValue } from '../utils/orderDetailDisplay.js'
import { getOrderStatusTone } from '../utils/orderStatus.js'

test('getOrderStatusTone maps backend order states to operator tones', () => {
  assert.equal(getOrderStatusTone('CANCELLED'), 'danger')
  assert.equal(getOrderStatusTone('FAILED'), 'danger')
  assert.equal(getOrderStatusTone('PROCESSING'), 'warning')
  assert.equal(getOrderStatusTone('ON_HOLD'), 'warning')
  assert.equal(getOrderStatusTone('SHIPPED'), 'success')
})

test('getOrderDetailDisplayValue safely displays object and empty values', () => {
  assert.equal(getOrderDetailDisplayValue(null), '-')
  assert.equal(getOrderDetailDisplayValue(''), '-')
  assert.equal(getOrderDetailDisplayValue({ label: 'Amazon' }), 'Amazon')
  assert.equal(getOrderDetailDisplayValue(['A', 'B']), 'A, B')
})
