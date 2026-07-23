import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('detail drawers render above the fixed application header', () => {
  const themeSource = readFileSync(new URL('./index.js', import.meta.url), 'utf8')

  assert.equal(themeSource.includes('MuiDrawer'), true)
  assert.equal(themeSource.includes('zIndex: theme.zIndex.modal'), true)
})
