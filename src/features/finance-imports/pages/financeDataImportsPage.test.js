import assert from 'node:assert/strict'
import test from 'node:test'

import { filterNavigationByUser, SIDEBAR_NAVIGATION } from '../../../layouts/sidebarNavigation.js'
import {
  getFinanceImportBatchActions,
  getFinanceImportBatchSummary,
  getFinanceImportDefaults,
  getFinanceImportedDataActions,
  getFinanceImportedDataQuery,
  getFinanceImportFileValues,
} from '../utils/financeImportsAccess.js'

function collectLeafIds(items) {
  return items.flatMap((item) => {
    if (item.children) return collectLeafIds(item.children)
    if (item.items) return collectLeafIds(item.items)
    return [item.id]
  })
}

test('finance imports navigation is visible with read access', () => {
  const leafIds = collectLeafIds(
    filterNavigationByUser(SIDEBAR_NAVIGATION, { permissions: ['FINANCE:READ'] }),
  )

  assert.equal(leafIds.includes('finance-imports'), true)
})

test('finance import actions stay read-only unless write access and a failed batch allow reprocessing', () => {
  assert.deepEqual(getFinanceImportBatchActions({ permissions: ['FINANCE:READ'] }, 'FAILED'), ['DETAILS'])
  assert.deepEqual(getFinanceImportBatchActions({ permissions: ['FINANCE:WRITE'] }, 'COMPLETED'), ['DETAILS'])
  assert.deepEqual(getFinanceImportBatchActions({ permissions: ['FINANCE:WRITE'] }, 'PARTIAL_FAILED'), [
    'DETAILS',
    'REPROCESS',
  ])
  assert.equal(getFinanceImportBatchActions({ permissions: ['FINANCE:WRITE'] }, 'FAILED').includes('EDIT'), false)
  assert.equal(getFinanceImportBatchActions({ permissions: ['FINANCE:WRITE'] }, 'FAILED').includes('DELETE'), false)
})

test('finance import source summaries expose the latest status and row/error counts', () => {
  assert.deepEqual(
    getFinanceImportBatchSummary({ status: 'PARTIAL_FAILED', validRows: 11, errorCount: 2 }),
    { hasBatch: true, status: 'PARTIAL_FAILED', importedRows: 11, errorCount: 2 },
  )
})

test('finance import source summaries distinguish an empty source from a processing batch', () => {
  assert.deepEqual(
    getFinanceImportBatchSummary(),
    { hasBatch: false, status: null, importedRows: 0, errorCount: 0 },
  )
})

test('finance imports persist by default', () => {
  assert.equal(getFinanceImportDefaults('ADS').dryRun, false)
})

test('finance imports use the selected filename as the default source reference', () => {
  const values = getFinanceImportFileValues(getFinanceImportDefaults('ADS'), { name: 'ads-report.csv' })

  assert.equal(values.sourceRef, 'ads-report.csv')
})

test('imported data query preserves the status filter and exposes only read details', () => {
  assert.deepEqual(
    getFinanceImportedDataQuery({ shopId: 'shop-1', status: 'POSTED' }, 2, 20),
    { shopId: 'shop-1', status: 'POSTED', page: 2, limit: 20 },
  )
  assert.deepEqual(getFinanceImportedDataActions(), ['DETAILS'])
})
