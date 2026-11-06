import type { AxiosAdapter } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { apiClient, uploadApiClient } from '@/shared/api'
import {
  getAccessToken,
  hasRefreshSession,
  SESSION_EXPIRED_EVENT,
  setAccessToken,
  setHasRefreshSession,
  setPermissions,
} from '@/shared/auth/session'

const create401Error = (config: unknown) => ({
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

const unauthorizedAdapter: AxiosAdapter = async (config) => Promise.reject(create401Error(config))

describe('apiClient authentication expiry and auto-refresh queue', () => {
  beforeEach(() => {
    setAccessToken('expired-access-token')
    setHasRefreshSession(true)
    setPermissions(['HR_EMPLOYEES:READ'])
  })

  afterEach(() => {
    setAccessToken(null)
    setHasRefreshSession(false)
  })

  it('automatically refreshes and retries protected request when 401 is received and refresh session is active', async () => {
    let refreshCalls = 0
    let protectedCalls = 0

    const adapter: AxiosAdapter = async (config) => {
      const url = config.url
      if (url === '/api/auth/refresh' || url?.endsWith('/api/auth/refresh')) {
        refreshCalls++
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
          data: {
            success: true,
            data: { accessToken: 'new-valid-access-token' },
          },
        }
      }

      if (url === '/api/hr/employee-profiles') {
        protectedCalls++
        const headers = config.headers as Record<string, string> | undefined
        const authHeader = headers?.Authorization || headers?.['Authorization']
        if (authHeader === 'Bearer new-valid-access-token') {
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
            data: { success: true, data: [{ id: 'emp-1' }] },
          }
        }
        return Promise.reject(create401Error(config))
      }

      return Promise.reject(new Error(`Unexpected url: ${url}`))
    }

    const result = await apiClient.get('/api/hr/employee-profiles', { adapter })

    expect(result).toEqual({ success: true, data: [{ id: 'emp-1' }] })
    expect(refreshCalls).toBe(1)
    expect(protectedCalls).toBe(2)
    expect(getAccessToken()).toBe('new-valid-access-token')
  })

  it('expires the full session when /api/auth/refresh is rejected directly', async () => {
    const onExpired = vi.fn()
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired, { once: true })

    await expect(
      apiClient.post('/api/auth/refresh', {}, { adapter: unauthorizedAdapter }),
    ).rejects.toMatchObject({
      status: 401,
    })

    expect(getAccessToken()).toBeNull()
    expect(hasRefreshSession()).toBe(false)
    expect(onExpired).toHaveBeenCalledOnce()
  })

  it('expires the full session when auto-refresh fails with 401', async () => {
    const onExpired = vi.fn()
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired, { once: true })

    const adapter: AxiosAdapter = async (config) => {
      return Promise.reject(create401Error(config))
    }

    await expect(apiClient.get('/api/hr/employee-profiles', { adapter })).rejects.toMatchObject({
      status: 401,
    })

    expect(getAccessToken()).toBeNull()
    expect(hasRefreshSession()).toBe(false)
    expect(onExpired).toHaveBeenCalledOnce()
  })

  it('queues concurrent 401 requests and retries all of them with only 1 refresh call', async () => {
    let refreshCalls = 0
    const profileCalls: string[] = []

    const adapter: AxiosAdapter = async (config) => {
      const url = config.url
      if (url === '/api/auth/refresh' || url?.endsWith('/api/auth/refresh')) {
        refreshCalls++
        await new Promise((resolve) => setTimeout(resolve, 25))
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
          data: {
            success: true,
            data: { accessToken: 'concurrent-refreshed-token' },
          },
        }
      }

      if (url?.startsWith('/api/data/')) {
        const id = url.replace('/api/data/', '')
        const headers = config.headers as Record<string, string> | undefined
        const authHeader = headers?.Authorization || headers?.['Authorization']
        if (authHeader === 'Bearer concurrent-refreshed-token') {
          profileCalls.push(id)
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
            data: { success: true, data: { id, content: `data-${id}` } },
          }
        }
        return Promise.reject(create401Error(config))
      }

      return Promise.reject(new Error(`Unexpected url: ${url}`))
    }

    const [res1, res2, res3] = await Promise.all([
      apiClient.get('/api/data/1', { adapter }),
      apiClient.get('/api/data/2', { adapter }),
      apiClient.get('/api/data/3', { adapter }),
    ])

    expect(refreshCalls).toBe(1)
    expect(profileCalls.sort()).toEqual(['1', '2', '3'])
    expect(res1).toEqual({ success: true, data: { id: '1', content: 'data-1' } })
    expect(res2).toEqual({ success: true, data: { id: '2', content: 'data-2' } })
    expect(res3).toEqual({ success: true, data: { id: '3', content: 'data-3' } })
    expect(getAccessToken()).toBe('concurrent-refreshed-token')
  })

  it('does not expire an existing session when the login form itself returns 401', async () => {
    const onExpired = vi.fn()
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired, { once: true })

    await expect(
      apiClient.post('/api/auth/login', {}, { adapter: unauthorizedAdapter }),
    ).rejects.toMatchObject({
      status: 401,
    })

    expect(getAccessToken()).toBe('expired-access-token')
    expect(hasRefreshSession()).toBe(true)
    expect(onExpired).not.toHaveBeenCalled()
  })

  it('expires the session immediately if protected request returns 401 without an active refresh session', async () => {
    setHasRefreshSession(false)
    const onExpired = vi.fn()
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired, { once: true })

    await expect(
      apiClient.get('/api/hr/employee-profiles', { adapter: unauthorizedAdapter }),
    ).rejects.toMatchObject({
      status: 401,
    })

    expect(getAccessToken()).toBeNull()
    expect(onExpired).toHaveBeenCalledOnce()
  })

  it('expires session and stops retry loop when retried request returns 401 again', async () => {
    let protectedCalls = 0
    const onExpired = vi.fn()
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired, { once: true })

    const adapter: AxiosAdapter = async (config) => {
      const url = config.url
      if (url === '/api/auth/refresh' || url?.endsWith('/api/auth/refresh')) {
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
          data: { success: true, data: { accessToken: 'still-invalid-token' } },
        }
      }

      if (url === '/api/hr/employee-profiles') {
        protectedCalls++
        return Promise.reject(create401Error(config))
      }

      return Promise.reject(new Error(`Unexpected url: ${url}`))
    }

    await expect(apiClient.get('/api/hr/employee-profiles', { adapter })).rejects.toMatchObject({
      status: 401,
    })

    expect(protectedCalls).toBe(2)
    expect(getAccessToken()).toBeNull()
    expect(hasRefreshSession()).toBe(false)
    expect(onExpired).toHaveBeenCalledOnce()
  })

  it('automatically refreshes and retries uploadApiClient requests on 401', async () => {
    let refreshCalls = 0
    let uploadCalls = 0

    const adapter: AxiosAdapter = async (config) => {
      const url = config.url
      if (url === '/api/auth/refresh' || url?.endsWith('/api/auth/refresh')) {
        refreshCalls++
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
          data: { success: true, data: { accessToken: 'upload-refreshed-token' } },
        }
      }

      if (url === '/api/upload/file') {
        uploadCalls++
        const headers = config.headers as Record<string, string> | undefined
        const authHeader = headers?.Authorization || headers?.['Authorization']
        if (authHeader === 'Bearer upload-refreshed-token') {
          return {
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
            data: { success: true, data: { fileUrl: 'https://cdn.example.com/file.png' } },
          }
        }
        return Promise.reject(create401Error(config))
      }

      return Promise.reject(new Error(`Unexpected url: ${url}`))
    }

    const result = await uploadApiClient.post('/api/upload/file', {}, { adapter })

    expect(result).toEqual({ success: true, data: { fileUrl: 'https://cdn.example.com/file.png' } })
    expect(refreshCalls).toBe(1)
    expect(uploadCalls).toBe(2)
    expect(getAccessToken()).toBe('upload-refreshed-token')
  })
})
