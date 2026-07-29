import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('detail drawers render above the fixed application header', () => {
  const themeSource = readFileSync(new URL('./index.js', import.meta.url), 'utf8')

  assert.equal(themeSource.includes('MuiDrawer'), true)
  assert.equal(themeSource.includes('zIndex: theme.zIndex.modal'), true)
})

test('Tailwind semantic colors stay aligned with the MUI light and dark palettes', () => {
  const stylesSource = readFileSync(new URL('../styles/tailwind.css', import.meta.url), 'utf8')

  for (const [name, value] of [
    ['primary', '#E83B4A'],
    ['page', '#F6F7F9'],
    ['surface', '#FFFFFF'],
    ['border', '#E3E6EA'],
    ['ink', '#171A1F'],
  ]) {
    assert.equal(stylesSource.includes(`--color-${name}: ${value.toLowerCase()}`), true)
  }

  const darkThemeBlock = stylesSource.slice(stylesSource.indexOf('.dark {'))
  for (const [name, value] of [
    ['primary', '#FF6B6B'],
    ['page', '#121417'],
    ['surface', '#1C1F23'],
    ['border', '#2D3036'],
    ['ink', '#F3F4F6'],
  ]) {
    assert.equal(darkThemeBlock.includes(`--color-${name}: ${value.toLowerCase()}`), true)
  }
})
