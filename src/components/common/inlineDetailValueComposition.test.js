import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const componentSource = readFileSync(new URL('./InlineDetailValue.jsx', import.meta.url), 'utf8')
const scaleSource = readFileSync(
  new URL('../../features/scale/pages/ScalePage.jsx', import.meta.url),
  'utf8',
)
const qcPreviewSource = readFileSync(
  new URL('../../features/qc/components/QcImageReviewDialog.jsx', import.meta.url),
  'utf8',
)

test('InlineDetailValue renders a bold label and readable value', () => {
  assert.match(componentSource, /function InlineDetailValue/)
  assert.match(componentSource, /\{normalizedLabel\}:\s*<\/span>/)
  assert.match(componentSource, /replace\(\/:\\s\*\$\//)
  assert.match(componentSource, /break-words/)
})

test('Scale and QC image review reuse InlineDetailValue', () => {
  assert.match(scaleSource, /InlineDetailValue/)
  assert.match(qcPreviewSource, /InlineDetailValue/)
})
