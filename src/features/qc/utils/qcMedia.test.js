import assert from 'node:assert/strict'
import test from 'node:test'

import { createQcPreviewImageSource } from './qcMedia.js'

test('createQcPreviewImageSource fetches protected media downloads as blob URLs', async () => {
  const requests = []
  const revoked = []
  const source = await createQcPreviewImageSource('/api/media/assets/asset-1/download', {
    fetchBlob: async (url) => {
      requests.push(url)
      return { type: 'image/png' }
    },
    createObjectUrl: () => 'blob:asset-1',
    revokeObjectUrl: (url) => revoked.push(url),
  })

  assert.equal(source.url, 'blob:asset-1')
  assert.deepEqual(requests, ['/api/media/assets/asset-1/download'])
  source.revoke()
  assert.deepEqual(revoked, ['blob:asset-1'])
})

test('createQcPreviewImageSource leaves public image URLs untouched', async () => {
  let requested = false
  const source = await createQcPreviewImageSource('https://images.example.com/reference.png', {
    fetchBlob: async () => {
      requested = true
    },
  })

  assert.equal(source.url, 'https://images.example.com/reference.png')
  assert.equal(requested, false)
})
