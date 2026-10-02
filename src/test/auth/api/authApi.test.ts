import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api', async () => {
  const actual = await vi.importActual<typeof import('@/shared/api')>('@/shared/api')
  return {
    ...actual,
    apiClient: { get: vi.fn(), post: vi.fn() },
  }
})

import {
  changeOwnPassword,
  getCurrentAccount,
  logout,
  restoreSession,
} from '@/features/auth/api/authApi'
import { apiClient, ApiError } from '@/shared/api'
import {
  getAccessToken,
  getGlobalPermissions,
  getPermissions,
  setAccessToken,
  setHasRefreshSession,
} from '@/shared/auth/session'

describe('logout', () => {
  beforeEach(() => {
    setAccessToken('access-token')
    setHasRefreshSession(false)
    vi.clearAllMocks()
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        account: { id: 'account-1', email: 'staff@lng.co', mustChangePassword: false },
        roles: [],
        permissions: [],
        scopes: [],
        profileSetupRequired: false,
      },
    })
  })

  it('revokes the cookie session and clears the in-memory access token', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(undefined)

    await logout()

    expect(apiClient.post).toHaveBeenCalledWith('/api/auth/logout')
    expect(getAccessToken()).toBeNull()
  })

  it('restores the access token from the refresh cookie', async () => {
    setAccessToken(null)
    setHasRefreshSession(true)
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { accessToken: 'restored-access', permissions: ['AUTH:WRITE'] },
    })
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        account: { id: 'account-1', email: 'staff@lng.co', mustChangePassword: false },
        roles: [],
        permissions: ['AUTH:WRITE'],
        scopes: [],
        profileSetupRequired: false,
      },
    })

    await restoreSession()

    expect(apiClient.post).toHaveBeenCalledWith('/api/auth/refresh')
    expect(getAccessToken()).toBe('restored-access')
    expect(getPermissions()).toEqual(['AUTH:WRITE'])
    expect(getGlobalPermissions()).toEqual(['AUTH:WRITE'])
  })

  it('preserves required profile setup when restoring the refresh session', async () => {
    setAccessToken(null)
    setHasRefreshSession(true)
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        accessToken: 'restored-access',
        account: { id: 'account-1', email: 'luannd@lngwork.co', mustChangePassword: false },
        roles: ['USER'],
        permissions: ['ORDERS:READ'],
        scopes: [],
      },
    })
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        account: { id: 'account-1', email: 'luannd@lngwork.co', mustChangePassword: false },
        roles: ['USER'],
        permissions: ['ORDERS:READ'],
        scopes: [],
        profileSetupRequired: true,
      },
    })

    await expect(restoreSession()).resolves.toMatchObject({ profileSetupRequired: true })

    expect(apiClient.get).toHaveBeenCalledWith('/api/auth/me')
  })

  it('clears a stale access token when refresh is rejected', async () => {
    setAccessToken(null)
    setHasRefreshSession(true)
    vi.mocked(apiClient.post).mockRejectedValue(new ApiError('Unauthorized', { status: 401 }))

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
    setHasRefreshSession(true)
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        accessToken: 'scoped-access',
        permissions: [],
        scopes: [{ permissions: ['HR_ATTENDANCE:READ'] }],
      },
    })
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        account: { id: 'account-1', email: 'staff@lng.co', mustChangePassword: false },
        roles: [],
        permissions: [],
        scopes: [
          {
            assignmentId: 'assignment-1',
            scopeType: 'team',
            scopeId: 'team-1',
            resourceId: 'team-1',
            roles: [],
            permissions: ['HR_ATTENDANCE:READ'],
          },
        ],
        profileSetupRequired: false,
      },
    })

    await restoreSession()

    expect(getPermissions()).toEqual(['HR_ATTENDANCE:READ'])
    expect(getGlobalPermissions()).toEqual([])
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
