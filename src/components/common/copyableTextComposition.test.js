import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./CopyableText.jsx', import.meta.url), 'utf8')

test('CopyableText copies with one click and opens an anchored popover', () => {
  assert.equal(source.includes('navigator.clipboard.writeText(text)'), true)
  assert.equal(source.includes('event.stopPropagation()'), true)
  assert.equal(source.includes('setAnchorEl(event.currentTarget)'), true)
  assert.equal(source.includes('<Popover'), true)
  assert.equal(source.includes('anchorEl={anchorEl}'), true)
  assert.equal(source.includes('onClose={() => setAnchorEl(null)}'), true)
  assert.equal(source.includes("cursor: 'copy'"), true)
  assert.equal(source.includes('textDecoration'), false)
})
