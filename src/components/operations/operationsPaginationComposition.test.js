import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('operations pagination keeps controls centered on the page', () => {
  const source = readFileSync(new URL('./OperationsPagination.jsx', import.meta.url), 'utf8')

  assert.equal(source.includes('grid grid-cols-[1fr_auto_1fr]'), true)
  assert.equal(source.includes('justify-between'), false)
})
