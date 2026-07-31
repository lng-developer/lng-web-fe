import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { apiClient } from '@/shared/api'
import {
  getAccessToken,
  getPermissions,
  setAccessToken,
  setPermissions,
} from '@/shared/auth/session'

const unauthorizedAdapter = async (config: object) =>
  Promise.reject({
    isAxiosError: true,
    message: 'Request failed with status code 401',
    config,
    response: {
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config,
      data: {
        success: false,
        error: { code: 'AUTHENTICATION_ERROR', message: 'Authentication required' },
      },
    },
  })

describe('apiClient authentication expiry', () => {
  beforeEach(() => {
    setAccessToken('expired-access-token')
    setPermissions(['HR_EMPLOYEES:READ'])
  })

  afterEach(() => {
    setAccessToken(null)
  })

  it('clears the session and announces expiry when a protected request returns 401', async () => {
    const onExpired = vi.fn()
    window.addEventListener('auth:session-expired', onExpired, { once: true })

    await expect(
      apiClient.get('/api/hr/employee-profiles', { adapter: unauthorizedAdapter }),
    ).rejects.toMatchObject({
      status: 401,
    })

    expect(getAccessToken()).toBeNull()
    expect(getPermissions()).toEqual([])
    expect(onExpired).toHaveBeenCalledOnce()
  })

  it('does not expire an existing session when the login form itself returns 401', async () => {
    const onExpired = vi.fn()
    window.addEventListener('auth:session-expired', onExpired, { once: true })

    await expect(
      apiClient.post('/api/auth/login', {}, { adapter: unauthorizedAdapter }),
    ).rejects.toMatchObject({
      status: 401,
    })

    expect(getAccessToken()).toBe('expired-access-token')
    expect(onExpired).not.toHaveBeenCalled()
  })
})
