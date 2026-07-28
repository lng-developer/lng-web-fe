import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

function queryFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return queryFiles(path)
    return entry.name.endsWith('.queries.js') ? [path] : []
  })
}

test('feature queries use TanStack Query v5 previous-data option', () => {
  const legacyOption = ['keepPreviousData', ': true'].join('')

  queryFiles(fileURLToPath(new URL('./', import.meta.url))).forEach((file) => {
    const source = readFileSync(file, 'utf8')

    assert.equal(source.includes(legacyOption), false, file)

    if (source.includes('placeholderData: keepPreviousData')) {
      assert.match(
        source,
        /import\s*\{[^}]*\bkeepPreviousData\b[^}]*\}\s*from\s*['"]@tanstack\/react-query['"]/,
        file,
      )
    }
  })
})
