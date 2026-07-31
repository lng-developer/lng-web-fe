import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api', () => ({ apiClient: { get: vi.fn(), patch: vi.fn(), post: vi.fn() } }))

import {
  loadMyEmployeeProfile,
  updateMyPersonalProfile,
  uploadMyEmployeeAvatar,
} from '@/features/hr/api/hrApi'
import { apiClient } from '@/shared/api'

describe('self profile API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads the authenticated employee profile', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { id: 'profile-1', employeeCode: 'J2601' } })

    await expect(loadMyEmployeeProfile()).resolves.toMatchObject({ employeeCode: 'J2601' })
    expect(apiClient.get).toHaveBeenCalledWith('/api/hr/employee-profiles/me')
  })

  it('submits only self-owned personal fields', async () => {
    const input = {
      phoneNumber: '0900000000',
      address: 'Ha Noi',
      personalEmail: 'staff@example.com',
      emergencyContact: { name: 'Parent', phone: '0911111111', relation: 'PARENT' },
    }
    vi.mocked(apiClient.patch).mockResolvedValue({ data: { id: 'profile-1', ...input } })

    await updateMyPersonalProfile(input)

    expect(apiClient.patch).toHaveBeenCalledWith('/api/hr/employee-profiles/me/personal', input)
  })

  it('uploads the authenticated employee avatar through the self-service route', async () => {
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' })
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { id: 'profile-1', avatarAssetId: 'asset-1' },
    })

    await uploadMyEmployeeAvatar(file)

    const body = vi.mocked(apiClient.post).mock.calls[0][1] as FormData
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/hr/employee-profiles/me/avatar',
      expect.any(FormData),
    )
    expect(body.get('file')).toBe(file)
  })
})
