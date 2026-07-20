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

test('Scale table header uses the shared sticky operations header treatment', () => {
  assert.match(scalePageSource, /operationsTableHeaderClass/)
  assert.match(scalePageSource, /operationsTextCaptionClass/)
})

test('Scale table hides both scrollbars without removing the scroll container', () => {
  assert.match(scalePageSource, /className="h-full overflow-auto scrollbar-none"/)
})

test('Scale table distributes the available width evenly across data columns', () => {
  const tableGridClass = scalePageSource.match(/const tableGridClass = '([^']+)'/)?.[1]

  assert.equal(tableGridClass, 'grid-cols-[repeat(8,minmax(0,1fr))]')
})

test('Scale table non-row content spans every shared column', () => {
  assert.match(scalePageSource, /col-span-full border-b border-border\/60 bg-surface-subtle/)
  assert.match(scalePageSource, /col-span-full flex h-48 items-center justify-center/)
})

test('Scale table keeps QC and Scale assignment columns only', () => {
  assert.deepEqual(
    SCALE_TABLE_COLUMNS.map((column) => column.id),
    ['orderId', 'orderDate', 'scaleStatus', 'shop', 'orderStatus', 'seller', 'qcBy', 'assignScale'],
  )
  assert.doesNotMatch(scalePageSource, /task\.(?:csAssigneeName|csStatus)/)
  assert.match(scalePageSource, /<OverflowText value=\{task\.qcBy\}/)
  assert.doesNotMatch(scalePageSource, /pillClassByValue\[task\.qcBy\]/)
})

test('Scale assignment dropdown uses the scale assignee lane', () => {
  assert.match(scalePageSource, /useAssignScaleTaskMutation/)
  assert.match(scalePageSource, /handleAssignScale/)
  assert.match(scalePageSource, /assignedDesignUserId/)
})

test('Scale table displays the full Order ID without a badge border', () => {
  assert.doesNotMatch(scalePageSource, /const ORDER_ID_MAX_LENGTH/)
  assert.match(
    scalePageSource,
    /className="block max-w-full break-all font-mono text-xs text-ink-secondary"/,
  )
})
