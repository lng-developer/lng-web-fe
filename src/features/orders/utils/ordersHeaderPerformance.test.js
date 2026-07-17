import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('orders tab header does not force synchronous full-page renders', () => {
  const source = readFileSync(new URL('../pages/OrdersPage.jsx', import.meta.url), 'utf8')

  assert.equal(source.includes('flushSync'), false)
})
