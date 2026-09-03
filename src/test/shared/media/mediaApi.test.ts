/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api', () => ({ apiClient: { delete: vi.fn(), get: vi.fn(), post: vi.fn() } }))

import { apiClient } from '@/shared/api'
import {
  abortMultipartUpload,
  completeMultipartUpload,
  downloadMediaAsset,
  downloadMediaAssets,
  fetchMediaBlob,
  initiateMultipartUpload,
  presignMultipartParts,
} from '@/shared/media'

describe('authenticated media API', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches protected media through the authenticated API client', async () => {
    const blob = new Blob(['media'], { type: 'image/png' })
    const signal = new AbortController().signal
    vi.mocked(apiClient.get).mockResolvedValue(blob)

    await expect(fetchMediaBlob('/api/media/assets/a/download', signal)).resolves.toBe(blob)
    expect(apiClient.get).toHaveBeenCalledWith('/api/media/assets/a/download?disposition=inline', {
      responseType: 'blob',
      signal,
    })
  })

  it('rejects an empty URL before calling the API', async () => {
    await expect(fetchMediaBlob('  ')).rejects.toThrow('Media download URL is required')
    expect(apiClient.get).not.toHaveBeenCalled()
  })

  it('downloads protected media through an authenticated blob URL', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      success: true,
      data: { url: 'https://wasabi.example/signed' },
    })
    const anchor = document.createElement('a')
    const click = vi.spyOn(anchor, 'click').mockImplementation(() => {})
    vi.spyOn(document, 'createElement').mockReturnValue(anchor)

    await downloadMediaAsset('/api/media/assets/a/download', 'design.psd')

    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/media/assets/a/download?disposition=attachment&redirect=false',
      { responseType: 'blob' },
    )
    expect(anchor.href).toBe('https://wasabi.example/signed')
    expect(anchor.download).toBe('design.psd')
    expect(click).toHaveBeenCalledTimes(1)
    expect(anchor.isConnected).toBe(false)
  })

  it('downloads streamed media through an authenticated object URL', async () => {
    const blob = new Blob(['media'], { type: 'image/jpeg' })
    vi.mocked(apiClient.get).mockResolvedValue(blob)
    const anchor = document.createElement('a')
    vi.spyOn(anchor, 'click').mockImplementation(() => {})
    vi.spyOn(document, 'createElement').mockReturnValue(anchor)
    const createObjectURL = vi.fn(() => 'blob:downloaded-media')
    const revokeObjectURL = vi.fn()
    class TestUrl extends URL {}
    Object.assign(TestUrl, { createObjectURL, revokeObjectURL })
    vi.stubGlobal('URL', TestUrl)

    await downloadMediaAsset('/api/media/assets/a/download', 'customer.jpg')

    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/media/assets/a/download?disposition=attachment&redirect=false',
      { responseType: 'blob' },
    )
    expect(anchor.href).toBe('blob:downloaded-media')
    expect(anchor.download).toBe('customer.jpg')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:downloaded-media')
  })

  it('downloads multiple protected assets as one ZIP file', async () => {
    const first = new Blob(['first'], { type: 'image/jpeg' })
    const second = new Blob(['second'], { type: 'image/png' })
    vi.mocked(apiClient.get).mockResolvedValueOnce(first).mockResolvedValueOnce(second)
    const anchor = document.createElement('a')
    const click = vi.spyOn(anchor, 'click').mockImplementation(() => {})
    vi.spyOn(document, 'createElement').mockReturnValue(anchor)
    let archive: Blob | undefined
    const createObjectURL = vi.fn((blob: Blob) => {
      archive = blob
      return 'blob:customer-images'
    })
    const revokeObjectURL = vi.fn()
    class TestUrl extends URL {}
    Object.assign(TestUrl, { createObjectURL, revokeObjectURL })
    vi.stubGlobal('URL', TestUrl)

    await downloadMediaAssets(
      [
        { downloadUrl: '/api/media/assets/first/download', filename: 'front.jpg' },
        { downloadUrl: '/api/media/assets/second/download', filename: 'front.jpg' },
      ],
      '114-9346153-9624212-customer-images.zip',
    )

    expect(apiClient.get).toHaveBeenNthCalledWith(
      1,
      '/api/media/assets/first/download?disposition=attachment',
      { responseType: 'blob', signal: undefined },
    )
    expect(apiClient.get).toHaveBeenNthCalledWith(
      2,
      '/api/media/assets/second/download?disposition=attachment',
      { responseType: 'blob', signal: undefined },
    )
    expect(anchor.download).toBe('114-9346153-9624212-customer-images.zip')
    expect(click).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:customer-images')
    const { default: JSZip } = await import('jszip')
    expect(Object.keys((await JSZip.loadAsync(archive!)).files)).toEqual([
      'front.jpg',
      'front-2.jpg',
    ])
  })

  it('uses the backend multipart control contract', async () => {
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({
        success: true,
        data: { assetId: 'asset-1', partSize: 64, totalParts: 2 },
      })
      .mockResolvedValueOnce({ success: true, data: { parts: [{ partNumber: 1, url: 'signed' }] } })
      .mockResolvedValueOnce({ success: true, data: { id: 'asset-1', uploadStatus: 'READY' } })
    vi.mocked(apiClient.delete).mockResolvedValue({
      success: true,
      data: { id: 'asset-1', uploadStatus: 'ABORTED' },
    })

    await expect(
      initiateMultipartUpload({
        filename: 'package.zip',
        mimeType: 'application/zip',
        size: 100,
        assetPurpose: 'DESIGN_PACKAGE',
      }),
    ).resolves.toMatchObject({ assetId: 'asset-1' })
    await expect(presignMultipartParts('asset-1', [1])).resolves.toEqual([
      { partNumber: 1, url: 'signed' },
    ])
    await expect(
      completeMultipartUpload('asset-1', [{ partNumber: 1, etag: 'etag' }]),
    ).resolves.toMatchObject({ uploadStatus: 'READY' })
    await abortMultipartUpload('asset-1')

    expect(apiClient.post).toHaveBeenNthCalledWith(
      1,
      '/api/media/multipart/initiate',
      expect.any(Object),
    )
    expect(apiClient.post).toHaveBeenNthCalledWith(
      2,
      '/api/media/multipart/asset-1/presign-parts',
      { partNumbers: [1] },
    )
    expect(apiClient.post).toHaveBeenNthCalledWith(3, '/api/media/multipart/asset-1/complete', {
      parts: [{ partNumber: 1, etag: 'etag' }],
    })
    expect(apiClient.delete).toHaveBeenCalledWith('/api/media/multipart/asset-1')
  })
})
