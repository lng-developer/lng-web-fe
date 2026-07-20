import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('sidebar keeps the active child group open after route navigation', () => {
  const source = readFileSync(new URL('./AppSidebar.jsx', import.meta.url), 'utf8')

  assert.match(source, /const isOpen = active \|\| Boolean\(openItems\[item\.id\]\)/)
  assert.equal(source.includes('openItemsViewKey'), false)
})
