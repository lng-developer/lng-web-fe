import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

function readPageSource() {
  return readFileSync(new URL('./ShopsPage.jsx', import.meta.url), 'utf8')
}

test('shops page uses operations layout and id search', () => {
  const source = readPageSource()

  assert.equal(source.includes("from '@/components/operations'"), true)
  assert.equal(source.includes('<OperationsPageShell'), true)
  assert.equal(source.includes('<OperationsToolbar'), true)
  assert.equal(source.includes('<OperationsTable'), true)
  assert.equal(source.includes('<OperationsPagination'), true)
  assert.equal(source.includes("t('shops.filters.id')"), true)
  assert.equal(source.includes('useUpdateShopStatusMutation'), true)
})
