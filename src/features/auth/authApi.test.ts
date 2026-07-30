import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api', () => ({ apiClient: { post: vi.fn() } }))

import { apiClient } from '@/shared/api'
import { getAccessToken, setAccessToken } from '@/shared/auth/session'

import { logout, restoreSession } from './authApi'

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
    vi.mocked(apiClient.post).mockResolvedValue({ data: { accessToken: 'restored-access' } })

    await restoreSession()

    expect(apiClient.post).toHaveBeenCalledWith('/api/auth/refresh')
    expect(getAccessToken()).toBe('restored-access')
  })

  it('clears a stale access token when refresh is rejected', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error('Unauthorized'))

    await expect(restoreSession()).rejects.toThrow('Unauthorized')

    expect(getAccessToken()).toBeNull()
  })

  it('clears local access even when logout cannot reach the backend', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error('Network error'))

    await expect(logout()).rejects.toThrow('Network error')

    expect(getAccessToken()).toBeNull()
  })
})
