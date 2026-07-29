import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import test from 'node:test'

const componentFiles = readdirSync(new URL('./components', import.meta.url))
  .filter((name) => name.endsWith('.jsx'))
  .map((name) => new URL(`./components/${name}`, import.meta.url))

const files = [new URL('./pages/UsersRolesPage.jsx', import.meta.url), ...componentFiles]

test('RBAC uses MUI v9 slot and sx APIs without leaking props to the DOM', () => {
  const source = files.map((file) => readFileSync(file, 'utf8')).join('\n')

  for (const deprecatedProp of [
    'PaperProps=',
    'inputProps=',
    'TabIndicatorProps=',
    'alignItems=',
    'justifyContent=',
  ]) {
    assert.equal(source.includes(deprecatedProp), false, deprecatedProp)
  }
})
