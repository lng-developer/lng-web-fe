import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('main layout does not add top padding under the fixed app header', () => {
  const source = readFileSync(new URL('./MainLayout.jsx', import.meta.url), 'utf8')

  assert.equal(source.includes('h-[calc(100dvh-48px)]'), true)
  assert.equal(source.includes('overflow-hidden'), true)
  assert.equal(source.includes('pt-0'), true)
  assert.equal(source.includes('pb-0'), true)
  assert.equal(source.includes('p-4 transition-[margin] duration-200 md:p-6'), false)
})

test('main layout owns the semantic page canvas', () => {
  const source = readFileSync(new URL('./MainLayout.jsx', import.meta.url), 'utf8')

  assert.equal(source.includes('bg-page'), true)
})
