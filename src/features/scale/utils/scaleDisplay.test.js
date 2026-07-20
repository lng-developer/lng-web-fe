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

test('formatCompactOrderDate shortens the table date without dropping the year', () => {
  assert.equal(scaleDisplay.formatCompactOrderDate('2026-06-25 07:00'), '25 Jun 26')
})

test('isScaleSlotUploadDisabled allows replacing an existing scaled output', () => {
  assert.equal(typeof scaleDisplay.isScaleSlotUploadDisabled, 'function')
  assert.equal(
    scaleDisplay.isScaleSlotUploadDisabled(
      {
        fileCheckId: 'check-1',
        inputAssetId: 'input-1',
        outputAssetId: 'output-1',
      },
      false,
    ),
    false,
  )
})

test('isScaleSlotUploadDisabled only blocks active uploads', () => {
  assert.equal(scaleDisplay.isScaleSlotUploadDisabled({ inputAssetId: 'input-1' }, false), false)
  assert.equal(scaleDisplay.isScaleSlotUploadDisabled({ slotKey: 'FRONT' }, false), false)
  assert.equal(scaleDisplay.isScaleSlotUploadDisabled({ fileCheckId: 'check-1' }, false), false)
  assert.equal(scaleDisplay.isScaleSlotUploadDisabled({ fileCheckId: 'check-1' }, true), true)
})

test('getScaleUploadTarget prefers an existing missing scale slot output', () => {
  assert.deepEqual(
    scaleDisplay.getScaleUploadTarget({
      psdTemplate: { fileCheckId: 'psd-check-1' },
      mockups: [
        {
          fileCheckId: 'check-1',
          slotKey: 'FRONT',
          label: 'Front',
          sourceType: 'CUSTOMER_IMAGE',
          inputAssetId: 'input-1',
          outputStatus: 'MISSING',
        },
      ],
    }),
    {
      fileCheckId: 'check-1',
      isManual: false,
      slotKey: 'FRONT',
      slotLabel: 'Front',
      sourceType: 'CUSTOMER_IMAGE',
    },
  )
})

test('getScaleUploadTarget falls back to a manual front slot when no file check exists', () => {
  assert.deepEqual(scaleDisplay.getScaleUploadTarget({ psdTemplate: {}, mockups: [] }), {
    fileCheckId: null,
    isManual: true,
    slotKey: 'FRONT',
    slotLabel: 'Front',
    sourceType: 'CUSTOMER_IMAGE',
  })
})

test('getScaleManualUploadPosition resolves supported upload positions', () => {
  assert.equal(typeof scaleDisplay.getScaleManualUploadPosition, 'function')
  assert.deepEqual(scaleDisplay.getScaleManualUploadPosition('BACK'), {
    value: 'BACK',
    slotLabel: 'Back',
    labelKey: 'scale.manualUpload.positions.back',
  })
})

test('getScaleManualUploadPosition falls back to front for empty or unknown values', () => {
  assert.deepEqual(scaleDisplay.getScaleManualUploadPosition(''), {
    value: 'FRONT',
    slotLabel: 'Front',
    labelKey: 'scale.manualUpload.positions.front',
  })
  assert.deepEqual(scaleDisplay.getScaleManualUploadPosition('UNKNOWN'), {
    value: 'FRONT',
    slotLabel: 'Front',
    labelKey: 'scale.manualUpload.positions.front',
  })
})

test('getScaleSlotPreviewAssetId returns only uploaded output assets', () => {
  assert.equal(
    scaleDisplay.getScaleSlotPreviewAssetId({
      outputAssetId: 'asset-1',
      outputStatus: 'UPLOADED',
    }),
    'asset-1',
  )
  assert.equal(
    scaleDisplay.getScaleSlotPreviewAssetId({
      outputAssetId: 'asset-2',
      outputStatus: 'MISSING',
    }),
    null,
  )
  assert.equal(scaleDisplay.getScaleSlotPreviewAssetId({ outputStatus: 'UPLOADED' }), null)
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
