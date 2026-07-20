import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { formatMissingTranslationKey } from './formatMissingTranslationKey.js'

const srcDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const localeDirectory = path.join(srcDirectory, 'i18n', 'locales')

function findSourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name)
    if (entry.isDirectory()) return findSourceFiles(filePath)
    return /\.(js|jsx)$/.test(entry.name) && !entry.name.endsWith('.test.js') ? [filePath] : []
  })
}

function hasKey(messages, key) {
  return key.split('.').every((part) => messages && (messages = messages[part]) !== undefined)
}

function getStaticTranslationKeys() {
  return [
    ...new Set(
      findSourceFiles(srcDirectory).flatMap((filePath) =>
        [...readFileSync(filePath, 'utf8').matchAll(/\bt\(\s*['"]([^'"]+)['"]/g)].map(
          (match) => match[1],
        ),
      ),
    ),
  ]
}

test('static translation keys never render as technical i18n paths', () => {
  const keys = getStaticTranslationKeys()

  for (const language of ['en', 'vi']) {
    const messages = JSON.parse(
      readFileSync(path.join(localeDirectory, language, 'common.json'), 'utf8'),
    )
    const missing = keys.filter((key) => !hasKey(messages, key))

    assert.equal(
      missing.every((key) => formatMissingTranslationKey(key) !== key),
      true,
      `${language} exposes untranslated key paths`,
    )
  }
})

test('missing key labels retain the user-facing part of the key', () => {
  assert.equal(formatMissingTranslationKey('orders.actions.import'), 'Import')
  assert.equal(formatMissingTranslationKey('hrTime.fields.checkInAt.helperText'), 'Check In At')
})
