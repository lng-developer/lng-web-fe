import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  operationsPageHeightClass,
  operationsTableCellContentClass,
  operationsTableCellPaddingClass,
  operationsTableHeaderClass,
  operationsTableRowClass,
  operationsTableSurfaceClass,
  operationsTextBodyClass,
  operationsTextCaptionClass,
  operationsTextStrongClass,
} from './operationsLayout.js'

test('operations layout exposes shared shell and table tokens', () => {
  assert.equal(operationsPageHeightClass, 'h-[calc(100dvh-48px)] min-h-0')
  assert.equal(operationsPageHeightClass.includes('100dvh'), true)
  assert.equal(operationsTableSurfaceClass.includes('bg-surface'), true)
  assert.equal(operationsTableSurfaceClass.includes('scrollbar-none'), true)
  assert.equal(operationsTableHeaderClass.includes('sticky top-0'), true)
  assert.equal(operationsTableCellPaddingClass, 'px-4 py-3')
  assert.equal(operationsTableCellContentClass, 'grid min-h-10 w-full items-center')
  assert.equal(operationsTableRowClass.includes('border-t border-border'), true)
  assert.equal(operationsTextCaptionClass, 'text-xs font-semibold leading-[1.35]')
  assert.equal(operationsTextBodyClass, 'text-sm leading-[1.45]')
  assert.equal(operationsTextStrongClass, 'text-sm font-semibold leading-[1.45]')
})

test('operations hidden scrollbar utility keeps scroll behavior', () => {
  const stylesSource = readFileSync(new URL('../../styles/tailwind.css', import.meta.url), 'utf8')

  assert.equal(stylesSource.includes('.scrollbar-none'), true)
  assert.equal(stylesSource.includes('scrollbar-width: none'), true)
  assert.equal(stylesSource.includes('-ms-overflow-style: none'), true)
  assert.equal(stylesSource.includes('.scrollbar-none::-webkit-scrollbar'), true)
  assert.equal(stylesSource.includes('display: none'), true)
})

test('operations shell and table consume shared layout tokens', () => {
  const shellSource = readFileSync(new URL('./OperationsPageShell.jsx', import.meta.url), 'utf8')
  const tableSource = readFileSync(new URL('./OperationsTable.jsx', import.meta.url), 'utf8')

  assert.equal(shellSource.includes('operationsPageHeightClass'), true)
  assert.equal(shellSource.includes("from '@/constants/app'"), false)
  assert.equal(shellSource.includes('px-4 pt-0 pb-0'), true)
  assert.equal(shellSource.includes('sticky top-0 z-30'), true)
  assert.equal(shellSource.includes('top: LAYOUT_SIZES.HEADER_HEIGHT'), false)
  assert.equal(shellSource.includes('bg-surface p-4'), false)
  assert.equal(tableSource.includes('operationsTableSurfaceClass'), true)
  assert.equal(tableSource.includes('operationsTableHeaderClass'), true)
  assert.equal(tableSource.includes('operationsTableCellPaddingClass'), true)
  assert.equal(tableSource.includes('operationsTableCellContentClass'), true)
  assert.equal(tableSource.includes('operationsTableRowClass'), true)
  assert.equal(tableSource.includes('operationsTextCaptionClass'), true)
  assert.equal(tableSource.includes('operationsTextStrongClass'), true)
})
