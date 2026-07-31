import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }))

import {
  changeOwnPassword,
  getCurrentAccount,
  logout,
  restoreSession,
} from '@/features/auth/api/authApi'
import { apiClient } from '@/shared/api'
import { getAccessToken, getPermissions, setAccessToken } from '@/shared/auth/session'

describe('logout', () => {
  beforeEach(() => setAccessToken('access-token'))

  it('revokes the cookie session and clears the in-memory access token', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(undefined)

    await logout()

    expect(apiClient.post).toHaveBeenCalledWith('/api/auth/logout')
    expect(getAccessToken()).toBeNull()
  })

  it('restores the access token from the refresh cookie', async () => {
    setAccessToken(null)
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { accessToken: 'restored-access', permissions: ['AUTH:WRITE'] },
    })

    await restoreSession()

    expect(apiClient.post).toHaveBeenCalledWith('/api/auth/refresh')
    expect(getAccessToken()).toBe('restored-access')
    expect(getPermissions()).toEqual(['AUTH:WRITE'])
  })

  it('clears a stale access token when refresh is rejected', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error('Unauthorized'))

    await expect(restoreSession()).rejects.toThrow('Unauthorized')

    expect(getAccessToken()).toBeNull()
    expect(getPermissions()).toEqual([])
  })

  it('clears local access even when logout cannot reach the backend', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error('Network error'))

    await expect(logout()).rejects.toThrow('Network error')

    expect(getAccessToken()).toBeNull()
  })

  it('keeps scoped permissions available to permission-driven pages', async () => {
    setAccessToken(null)
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        accessToken: 'scoped-access',
        permissions: [],
        scopes: [{ permissions: ['HR_ATTENDANCE:READ'] }],
      },
    })

    await restoreSession()

    expect(getPermissions()).toEqual(['HR_ATTENDANCE:READ'])
  })

  it('loads the current setup state', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        account: { id: 'account-1', email: 'staff@lng.co', mustChangePassword: false },
        roles: [],
        permissions: [],
        profileSetupRequired: true,
      },
    })

    await expect(getCurrentAccount()).resolves.toMatchObject({ profileSetupRequired: true })
    expect(apiClient.get).toHaveBeenCalledWith('/api/auth/me')
  })

  it('changes the current account password', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { id: 'account-1', email: 'staff@lng.co', mustChangePassword: false },
    })

    await expect(changeOwnPassword('123456', 'new-password')).resolves.toMatchObject({
      mustChangePassword: false,
    })
    expect(apiClient.post).toHaveBeenCalledWith('/api/auth/me/change-password', {
      currentPassword: '123456',
      newPassword: 'new-password',
    })
  })
})
