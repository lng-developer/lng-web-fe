import assert from 'node:assert/strict'
import test from 'node:test'

import * as scaleDisplay from './scaleDisplay.js'

test('truncateDisplayText keeps values within the character limit unchanged', () => {
  assert.equal(typeof scaleDisplay.truncateDisplayText, 'function')
  assert.equal(scaleDisplay.truncateDisplayText('Alpha Shop', 16), 'Alpha Shop')
  assert.equal(scaleDisplay.truncateDisplayText('1234567890123456', 16), '1234567890123456')
})

test('truncateDisplayText appends an ellipsis after the character limit', () => {
  assert.equal(scaleDisplay.truncateDisplayText('Very Long Shop Name', 16), 'Very Long Shop N...')
})

test('truncateDisplayText handles empty and non-string values', () => {
  assert.equal(scaleDisplay.truncateDisplayText(null, 16), '')
  assert.equal(scaleDisplay.truncateDisplayText(12345, 16), '12345')
})

test('copyDisplayText uses the Clipboard API with the complete source value', async () => {
  assert.equal(typeof scaleDisplay.copyDisplayText, 'function')
  let copiedValue = null

  const result = await scaleDisplay.copyDisplayText('ORDER-ID-FULL-VALUE', {
    clipboard: {
      writeText: async (value) => {
        copiedValue = value
      },
    },
  })

  assert.equal(copiedValue, 'ORDER-ID-FULL-VALUE')
  assert.equal(result, 'ORDER-ID-FULL-VALUE')
})

test('copyDisplayText falls back to a temporary textarea and removes it', async () => {
  const textarea = {
    value: '',
    style: {},
    selected: false,
    setAttribute() {},
    select() {
      this.selected = true
    },
  }
  const body = {
    appendedNode: null,
    removedNode: null,
    appendChild(node) {
      this.appendedNode = node
    },
    removeChild(node) {
      this.removedNode = node
    },
  }
  const document = {
    body,
    createElement: () => textarea,
    execCommand: (command) => command === 'copy',
  }

  const result = await scaleDisplay.copyDisplayText('ORDER-FALLBACK', {
    clipboard: null,
    document,
  })

  assert.equal(result, 'ORDER-FALLBACK')
  assert.equal(textarea.value, 'ORDER-FALLBACK')
  assert.equal(textarea.selected, true)
  assert.equal(body.appendedNode, textarea)
  assert.equal(body.removedNode, textarea)
})
