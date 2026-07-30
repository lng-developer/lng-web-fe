import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./components/AccessExplorer.jsx', import.meta.url), 'utf8')

test('Access Explorer keeps account actions visible when the desktop three-pane layout is too narrow', () => {
  assert.equal(source.includes('md:grid-cols-[280px_minmax(0,1fr)_280px]'), true)
})
