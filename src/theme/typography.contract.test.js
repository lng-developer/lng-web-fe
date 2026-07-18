import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { typography } from './typography.js'

test('MUI typography exposes one shared operations scale', () => {
  assert.equal(typography.fontFamily, 'Inter,Helvetica,Arial,sans-serif')
  assert.equal(typography.body1.fontSize, '0.875rem')
  assert.equal(typography.body2.fontSize, '0.8125rem')
  assert.equal(typography.caption.fontSize, '0.6875rem')
  assert.equal(typography.subtitle1.fontSize, typography.body1.fontSize)
  assert.equal(typography.subtitle2.fontSize, typography.body2.fontSize)
  assert.equal(typography.button.fontSize, typography.body1.fontSize)
})

test('Tailwind text utilities follow the same operations scale', () => {
  const source = readFileSync(new URL('../styles/tailwind.css', import.meta.url), 'utf8')

  assert.equal(source.includes('--text-xs: 0.6875rem;'), true)
  assert.equal(source.includes('--text-sm: 0.8125rem;'), true)
  assert.equal(source.includes('--text-base: 0.875rem;'), true)
  assert.equal(source.includes("--font-sans: 'Inter', 'Helvetica', 'Arial', sans-serif;"), true)
})
