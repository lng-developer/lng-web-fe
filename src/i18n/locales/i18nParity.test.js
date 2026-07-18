import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

function readLocale(language) {
  return JSON.parse(fs.readFileSync(new URL(`./${language}/common.json`, import.meta.url), 'utf8'))
}

function flatten(value, prefix = '', output = {}) {
  Object.entries(value).forEach(([key, entry]) => {
    const path = prefix ? `${prefix}.${key}` : key
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      flatten(entry, path, output)
    } else {
      output[path] = entry
    }
  })

  return output
}

test('english and vietnamese locales expose the same keys', () => {
  const en = flatten(readLocale('en'))
  const vi = flatten(readLocale('vi'))

  assert.deepEqual(
    Object.keys(vi).filter((key) => !(key in en)),
    [],
  )
  assert.deepEqual(
    Object.keys(en).filter((key) => !(key in vi)),
    [],
  )
})

test('shipping type translations live under orders namespace', () => {
  const vi = flatten(readLocale('vi'))

  assert.equal(
    vi['orders.updateShipping.title'],
    'C\u1eadp nh\u1eadt lo\u1ea1i v\u1eadn chuy\u1ec3n',
  )
  assert.equal(vi['listings.updateShipping.title'], undefined)
})

test('operational screen namespaces have localized labels', () => {
  const vi = flatten(readLocale('vi'))

  assert.equal(vi['shops.title'], 'C\u1eeda h\u00e0ng')
  assert.equal(vi['shipments.title'], 'V\u1eadn chuy\u1ec3n')
  assert.equal(vi['vendorSubmissions.title'], 'G\u1eedi vendor')
  assert.equal(vi['mapping.filters.searchResolve'], 'T\u00ecm order item, SKU, config')
  assert.equal(
    vi['apiCoverage.empty'],
    'Kh\u00f4ng c\u00f3 endpoint n\u00e0o kh\u1edbp b\u1ed9 l\u1ecdc hi\u1ec7n t\u1ea1i.',
  )
})
