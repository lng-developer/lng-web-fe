import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { SCALE_TABLE_COLUMNS } from '../constants/scaleConstants.js'

const scalePageSource = readFileSync(new URL('../pages/ScalePage.jsx', import.meta.url), 'utf8')

test('Scale table rows inherit one shared parent column grid', () => {
  assert.match(scalePageSource, /className=\{`grid w-full min-w-full \$\{tableGridClass\}`\}/)
  assert.match(scalePageSource, /grid-cols-subgrid/g)
  assert.doesNotMatch(scalePageSource, /className=\{`grid h-(?:11|14)[^`]*\$\{tableGridClass\}/)
})

test('Scale table distributes the available width evenly across data columns', () => {
  const tableGridClass = scalePageSource.match(/const tableGridClass = '([^']+)'/)?.[1]

  assert.equal(tableGridClass, 'grid-cols-[auto_repeat(8,minmax(0,1fr))]')
})

test('Scale table non-row content spans every shared column', () => {
  assert.match(scalePageSource, /col-span-full border-b border-border\/60 bg-surface-subtle/)
  assert.match(scalePageSource, /col-span-full flex h-48 items-center justify-center/)
})

test('Scale table excludes group and assignment status columns', () => {
  assert.deepEqual(
    SCALE_TABLE_COLUMNS.map((column) => column.id),
    [
      'expand',
      'orderId',
      'orderDate',
      'scaleStatus',
      'shop',
      'orderStatus',
      'orderOwner',
      'qcBy',
      'assignCs',
    ],
  )
  assert.doesNotMatch(scalePageSource, /task\.(?:groupId|groupType|assignmentStatus)/)
})

test('Scale table displays up to nineteen Order ID characters', () => {
  assert.match(scalePageSource, /const ORDER_ID_MAX_LENGTH = 19/)
})
