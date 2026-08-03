import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }))

import { listMediaAssets, uploadMediaAsset } from '@/features/portal/media/api/mediaApi'
import { apiClient } from '@/shared/api'

describe('mediaApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiClient.get).mockResolvedValue({ data: { items: [], pagination: {} } })
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} })
  })

  it('normalizes list filters', async () => {
    await listMediaAssets({ q: ' design ', status: 'ACTIVE', page: 2, limit: 20 })
    expect(apiClient.get).toHaveBeenCalledWith('/api/media/assets', {
      params: { q: 'design', status: 'ACTIVE', page: 2, limit: 20 },
    })
  })

  it('uploads one file field', async () => {
    const file = new File(['asset'], 'asset.png', { type: 'image/png' })
    await uploadMediaAsset(file)
    const form = vi.mocked(apiClient.post).mock.calls[0][1] as FormData
    expect(form.get('file')).toBe(file)
  })
})
