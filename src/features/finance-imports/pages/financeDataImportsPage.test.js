import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('finance data imports page renders read-only source and batch workbenches', () => {
  const source = readFileSync(new URL('./FinanceDataImportsPage.jsx', import.meta.url), 'utf8')

  assert.equal(source.includes("t('financeImports.title')"), true)
  assert.equal(source.includes('ADS'), true)
  assert.equal(source.includes('SETTLEMENTS'), true)
  assert.equal(source.includes('TRANSACTIONS'), true)
  assert.equal(source.includes('<OperationsTable'), true)
  assert.equal(source.includes('useFinanceImportBatchesQuery'), true)
  assert.equal(source.includes('useFinanceImportedDataQuery'), true)
  assert.equal(source.includes('Edit'), false)
  assert.equal(source.includes('Delete'), false)
})
