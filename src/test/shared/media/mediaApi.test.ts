/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api', () => ({ apiClient: { get: vi.fn() } }))

import { apiClient } from '@/shared/api'
import { downloadMediaAsset, fetchMediaBlob } from '@/shared/media'

describe('authenticated media API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:media'),
      revokeObjectURL: vi.fn(),
    })
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

  it('downloads with a temporary object URL and always revokes it', async () => {
    const blob = new Blob(['media'])
    const anchor = document.createElement('a')
    const click = vi.spyOn(anchor, 'click').mockImplementation(() => {})
    vi.spyOn(document, 'createElement').mockReturnValue(anchor)
    vi.mocked(apiClient.get).mockResolvedValue(blob)

    await downloadMediaAsset('/api/media/assets/a/download', 'design.psd')

    expect(URL.createObjectURL).toHaveBeenCalledWith(blob)
    expect(anchor.href).toBe('blob:media')
    expect(anchor.download).toBe('design.psd')
    expect(click).toHaveBeenCalledTimes(1)
    expect(anchor.isConnected).toBe(false)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:media')
  })
})
