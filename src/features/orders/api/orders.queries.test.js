import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('orders workbench keeps previous data during channel switches', () => {
  const source = readFileSync(new URL('./orders.queries.js', import.meta.url), 'utf8')
  const workbenchSource = source.slice(
    source.indexOf('export function useOrderWorkbenchQuery'),
    source.indexOf('export function useOrderSummaryQuery'),
  )
  const summarySource = source.slice(
    source.indexOf('export function useOrderSummaryQuery'),
    source.indexOf('export function useCustomerExceptionsQuery'),
  )

  assert.equal(source.includes('import { keepPreviousData, useQuery }'), true)
  assert.equal(workbenchSource.includes('placeholderData: keepPreviousData'), true)
  assert.equal(summarySource.includes('placeholderData: keepPreviousData'), true)
  assert.equal(workbenchSource.includes('keepPreviousData: true'), false)
  assert.equal(summarySource.includes('keepPreviousData: true'), false)
})
