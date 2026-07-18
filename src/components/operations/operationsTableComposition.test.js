import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('OperationsTable supports shared overrides and expanded rows', () => {
  const source = readFileSync(new URL('./OperationsTable.jsx', import.meta.url), 'utf8')

  assert.equal(source.includes('renderExpandedRow'), true)
  assert.equal(source.includes('getRowExpanded'), true)
  assert.equal(source.includes('getRowCellClassName'), true)
  assert.equal(source.includes('headerClassName'), true)
  assert.equal(source.includes('bodyClassName'), true)
  assert.equal(source.includes('colSpan={columns.length}'), true)
})

test('OperationsTable centers cell content through a shared wrapper', () => {
  const source = readFileSync(new URL('./OperationsTable.jsx', import.meta.url), 'utf8')

  assert.equal(source.includes('cellContentAlignClass(column.align)'), true)
  assert.equal(source.includes('operationsTableCellContentClass'), true)
  assert.equal(source.includes('justify-items-center'), true)
  assert.equal(source.includes('justify-items-end'), true)
})

test('OperationsTable lets narrow columns use compact cell padding', () => {
  const source = readFileSync(new URL('./OperationsTable.jsx', import.meta.url), 'utf8')

  assert.equal(source.includes('column.cellPaddingClass || operationsTableCellPaddingClass'), true)
})

test('OperationsTable keeps the table header visible while loading or empty', () => {
  const source = readFileSync(new URL('./OperationsTable.jsx', import.meta.url), 'utf8')

  assert.equal(source.includes('if (loading)'), false)
  assert.equal(source.includes('loading ? ('), true)
  assert.equal(source.includes('!loading && !rows.length'), true)
})
