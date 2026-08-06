/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api', () => ({ apiClient: { delete: vi.fn(), get: vi.fn(), post: vi.fn() } }))

import { apiClient } from '@/shared/api'
import {
  abortMultipartUpload,
  completeMultipartUpload,
  downloadMediaAsset,
  fetchMediaBlob,
  initiateMultipartUpload,
  presignMultipartParts,
} from '@/shared/media'

describe('authenticated media API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches protected media through the authenticated API client', async () => {
    const blob = new Blob(['media'], { type: 'image/png' })
    const signal = new AbortController().signal
    vi.mocked(apiClient.get).mockResolvedValue(blob)

    await expect(fetchMediaBlob('/api/media/assets/a/download', signal)).resolves.toBe(blob)
    expect(apiClient.get).toHaveBeenCalledWith('/api/media/assets/a/download', {
      responseType: 'blob',
      signal,
    })
  })

  it('rejects an empty URL before calling the API', async () => {
    await expect(fetchMediaBlob('  ')).rejects.toThrow('Media download URL is required')
    expect(apiClient.get).not.toHaveBeenCalled()
  })

  it('downloads directly through the authenticated backend URL', async () => {
    const anchor = document.createElement('a')
    const click = vi.spyOn(anchor, 'click').mockImplementation(() => {})
    vi.spyOn(document, 'createElement').mockReturnValue(anchor)

    await downloadMediaAsset('/api/media/assets/a/download', 'design.psd')

    expect(apiClient.get).not.toHaveBeenCalled()
    expect(anchor.href).toBe('http://localhost:3000/api/media/assets/a/download')
    expect(anchor.download).toBe('design.psd')
    expect(click).toHaveBeenCalledTimes(1)
    expect(anchor.isConnected).toBe(false)
  })

  it('uses the backend multipart control contract', async () => {
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ success: true, data: { assetId: 'asset-1', partSize: 64, totalParts: 2 } })
      .mockResolvedValueOnce({ success: true, data: { parts: [{ partNumber: 1, url: 'signed' }] } })
      .mockResolvedValueOnce({ success: true, data: { id: 'asset-1', uploadStatus: 'READY' } })
    vi.mocked(apiClient.delete).mockResolvedValue({ success: true, data: { id: 'asset-1', uploadStatus: 'ABORTED' } })

    await expect(initiateMultipartUpload({
      filename: 'package.zip', mimeType: 'application/zip', size: 100, assetPurpose: 'DESIGN_PACKAGE',
    })).resolves.toMatchObject({ assetId: 'asset-1' })
    await expect(presignMultipartParts('asset-1', [1])).resolves.toEqual([{ partNumber: 1, url: 'signed' }])
    await expect(completeMultipartUpload('asset-1', [{ partNumber: 1, etag: 'etag' }]))
      .resolves.toMatchObject({ uploadStatus: 'READY' })
    await abortMultipartUpload('asset-1')

    expect(apiClient.post).toHaveBeenNthCalledWith(1, '/api/media/multipart/initiate', expect.any(Object))
    expect(apiClient.post).toHaveBeenNthCalledWith(2, '/api/media/multipart/asset-1/presign-parts', { partNumbers: [1] })
    expect(apiClient.post).toHaveBeenNthCalledWith(3, '/api/media/multipart/asset-1/complete', {
      parts: [{ partNumber: 1, etag: 'etag' }],
    })
    expect(apiClient.delete).toHaveBeenCalledWith('/api/media/multipart/asset-1')
  })
})
