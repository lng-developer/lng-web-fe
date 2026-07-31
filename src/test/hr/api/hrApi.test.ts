import { beforeEach, describe, expect, it, vi } from 'vitest'

import { loadEmployeeAvatar, uploadEmployeeAvatar } from '@/features/hr/api/hrApi'
import { apiClient } from '@/shared/api'

vi.mock('@/shared/api', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}))

describe('HR API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uploads avatar bytes as multipart form data', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      success: true,
      data: { id: 'profile-1', avatarAssetId: 'asset-1' },
    })
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' })

    await uploadEmployeeAvatar('profile-1', file)

    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/hr/employee-profiles/profile-1/avatar',
      expect.any(FormData),
    )
    const body = vi.mocked(apiClient.post).mock.calls[0][1] as FormData
    expect(body.get('file')).toBe(file)
  })

  it('loads protected avatar bytes with the authenticated API client', async () => {
    const blob = new Blob(['avatar'], { type: 'image/png' })
    vi.mocked(apiClient.get).mockResolvedValue(blob)

    await expect(loadEmployeeAvatar('/api/hr/employee-profiles/me/avatar')).resolves.toMatch(
      /^data:image\/png;base64,/,
    )
    expect(apiClient.get).toHaveBeenCalledWith('/api/hr/employee-profiles/me/avatar', {
      responseType: 'blob',
    })
  })
})
