import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/media/mediaApi', () => ({
  abortMultipartUpload: vi.fn(),
  completeMultipartUpload: vi.fn(),
  initiateMultipartUpload: vi.fn(),
  presignMultipartParts: vi.fn(),
}))

import {
  abortMultipartUpload,
  completeMultipartUpload,
  initiateMultipartUpload,
  presignMultipartParts,
} from '@/shared/media/mediaApi'
import { uploadMultipartAsset } from '@/shared/media/uploadMultipartAsset'

describe('uploadMultipartAsset', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(initiateMultipartUpload).mockResolvedValue({ assetId: 'asset-1', partSize: 3, totalParts: 2 })
    vi.mocked(presignMultipartParts).mockResolvedValue([
      { partNumber: 1, url: 'https://wasabi/1' }, { partNumber: 2, url: 'https://wasabi/2' },
    ])
    vi.mocked(completeMultipartUpload).mockResolvedValue({ id: 'asset-1', uploadStatus: 'READY' })
  })

  it('uploads slices directly without an authorization header and completes sorted parts', async () => {
    const progress = vi.fn()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 200, headers: { etag: 'etag-1' } }))
      .mockResolvedValueOnce(new Response(null, { status: 200, headers: { etag: 'etag-2' } }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(uploadMultipartAsset(new File(['abcdef'], 'package.zip'), {
      assetPurpose: 'DESIGN_PACKAGE', onProgress: progress,
    })).resolves.toMatchObject({ uploadStatus: 'READY' })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'PUT' })
    expect(fetchMock.mock.calls[0][1]).not.toHaveProperty('headers')
    expect(completeMultipartUpload).toHaveBeenCalledWith('asset-1', [
      { partNumber: 1, etag: 'etag-1' }, { partNumber: 2, etag: 'etag-2' },
    ])
    expect(progress).toHaveBeenLastCalledWith(100)
  })

  it('aborts best effort when upload is cancelled', async () => {
    const controller = new AbortController()
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => {
      controller.abort()
      throw new DOMException('Aborted', 'AbortError')
    }))

    await expect(uploadMultipartAsset(new File(['abcdef'], 'package.zip'), {
      assetPurpose: 'DESIGN_PACKAGE', signal: controller.signal,
    })).rejects.toThrow()
    expect(abortMultipartUpload).toHaveBeenCalledWith('asset-1')
  })
})
