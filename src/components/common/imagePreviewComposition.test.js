import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const imagePreviewUrl = new URL('./ImagePreview.jsx', import.meta.url)
const imagePreviewSource = existsSync(imagePreviewUrl) ? readFileSync(imagePreviewUrl, 'utf8') : ''
const scalePageSource = readFileSync(
  new URL('../../features/scale/pages/ScalePage.jsx', import.meta.url),
  'utf8',
)
const vendorProductsSource = readFileSync(
  new URL('../../features/vendors/pages/VendorProductsPage.jsx', import.meta.url),
  'utf8',
)
const listingsSource = readFileSync(
  new URL('../../features/listings/pages/ListingsPage.jsx', import.meta.url),
  'utf8',
)
const qcReviewSource = readFileSync(
  new URL('../../features/qc/components/QcImageReviewDialog.jsx', import.meta.url),
  'utf8',
)

test('ImagePreview opens a full-screen dialog with zoom and close controls', () => {
  assert.match(imagePreviewSource, /Dialog/)
  assert.match(imagePreviewSource, /fullScreen/)
  assert.match(imagePreviewSource, /ZoomInIcon/)
  assert.match(imagePreviewSource, /ZoomOutIcon/)
  assert.match(imagePreviewSource, /CloseIcon/)
  assert.match(imagePreviewSource, /onClose/)
})

test('ImagePreview removes the native button border from image thumbnails', () => {
  assert.match(imagePreviewSource, /border-0 bg-transparent p-0/)
})

test('Scale detail uses ImagePreview for product, customization, and mockup images', () => {
  assert.match(scalePageSource, /import ImagePreview from '@\/components\/common\/ImagePreview'/)
  assert.match(scalePageSource, /<ImagePreview[\s\S]*detail\.product\.imageUrl/)
  assert.match(scalePageSource, /<ImagePreview[\s\S]*item\.url/)
  assert.match(scalePageSource, /<ImagePreview[\s\S]*previewUrl/)
  assert.match(scalePageSource, /onDownload=\{\(\) => onDownload\?\.\(assetId, downloadName\)\}/)
})

test('Content images on operational pages reuse ImagePreview', () => {
  assert.match(
    vendorProductsSource,
    /import ImagePreview from '@\/components\/common\/ImagePreview'/,
  )
  assert.match(listingsSource, /import ImagePreview from '@\/components\/common\/ImagePreview'/)
  assert.match(qcReviewSource, /import ImagePreview from '@\/components\/common\/ImagePreview'/)
})
