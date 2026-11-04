import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/shared/api'

const mocks = vi.hoisted(() => ({
  loginWithGoogle: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
}))

vi.mock('@/features/auth/api/authApi', () => ({
  loginWithGoogle: mocks.loginWithGoogle,
}))

vi.mock('@/shared/config/env', () => ({
  env: { googleClientId: 'test-google-client-id' },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

import { useGoogleLoginHandler } from '@/features/auth/google/useGoogleLoginHandler'

type TokenClientConfig = {
  client_id: string
  scope: string
  callback: (response: {
    access_token?: string
    error?: string
    error_description?: string
  }) => Promise<void> | void
  error_callback?: (error: { type: string; message: string }) => void
}

describe('useGoogleLoginHandler', () => {
  let latestTokenConfig: TokenClientConfig | null = null
  const mockRequestAccessToken = vi.fn()
  const mockInitTokenClient = vi.fn((config: TokenClientConfig) => {
    latestTokenConfig = config
    return { requestAccessToken: mockRequestAccessToken }
  })

  beforeEach(() => {
    latestTokenConfig = null
    mocks.loginWithGoogle.mockReset()
    mocks.navigate.mockReset()
    mockRequestAccessToken.mockReset()
    mockInitTokenClient.mockClear()

    document.body.innerHTML = ''
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    document.body.appendChild(script)

    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: mockInitTokenClient,
        },
      },
    } as unknown as typeof window.google
  })

  it('initializes token client and triggers google login', () => {
    const { result } = renderHook(() => useGoogleLoginHandler())

    expect(mockInitTokenClient).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: 'test-google-client-id',
        scope: 'email profile openid',
        callback: expect.any(Function),
        error_callback: expect.any(Function),
      }),
    )

    act(() => {
      result.current.triggerGoogleLogin()
    })

    expect(mockRequestAccessToken).toHaveBeenCalledWith({ prompt: 'select_account' })
    expect(result.current.googleLoading).toBe(true)
  })

  it('logs in successfully and navigates to / when mustChangePassword is false', async () => {
    mocks.loginWithGoogle.mockResolvedValueOnce({
      account: { mustChangePassword: false },
    })

    const { result } = renderHook(() => useGoogleLoginHandler())

    act(() => {
      result.current.triggerGoogleLogin()
    })

    await act(async () => {
      await latestTokenConfig?.callback({ access_token: 'google-test-token' })
    })

    expect(mocks.loginWithGoogle).toHaveBeenCalledWith({ accessToken: 'google-test-token' })
    expect(mocks.navigate).toHaveBeenCalledWith('/', { replace: true })
    expect(result.current.googleLoading).toBe(false)
    expect(result.current.googleError).toBeNull()
  })

  it('navigates to /setup/password when mustChangePassword is true', async () => {
    mocks.loginWithGoogle.mockResolvedValueOnce({
      account: { mustChangePassword: true },
    })

    const { result } = renderHook(() => useGoogleLoginHandler())

    act(() => {
      result.current.triggerGoogleLogin()
    })

    await act(async () => {
      await latestTokenConfig?.callback({ access_token: 'google-test-token' })
    })

    expect(mocks.loginWithGoogle).toHaveBeenCalledWith({ accessToken: 'google-test-token' })
    expect(mocks.navigate).toHaveBeenCalledWith('/setup/password', { replace: true })
    expect(result.current.googleLoading).toBe(false)
  })

  it('sets error when token response contains error and error_description', async () => {
    const { result } = renderHook(() => useGoogleLoginHandler())

    act(() => {
      result.current.triggerGoogleLogin()
    })

    await act(async () => {
      await latestTokenConfig?.callback({
        error: 'access_denied',
        error_description: 'User rejected permission',
      })
    })

    expect(result.current.googleLoading).toBe(false)
    expect(result.current.googleError).toBe('User rejected permission')
    expect(mocks.loginWithGoogle).not.toHaveBeenCalled()
  })

  it('sets error when token response contains error without error_description', async () => {
    const { result } = renderHook(() => useGoogleLoginHandler())

    act(() => {
      result.current.triggerGoogleLogin()
    })

    await act(async () => {
      await latestTokenConfig?.callback({
        error: 'access_denied',
      })
    })

    expect(result.current.googleLoading).toBe(false)
    expect(result.current.googleError).toBe('access_denied')
  })

  it('sets error when token response has no access token', async () => {
    const { result } = renderHook(() => useGoogleLoginHandler())

    act(() => {
      result.current.triggerGoogleLogin()
    })

    await act(async () => {
      await latestTokenConfig?.callback({})
    })

    expect(result.current.googleLoading).toBe(false)
    expect(result.current.googleError).toBe('auth.login.googleFailed')
  })

  it('sets error when error_callback is invoked with a message', () => {
    const { result } = renderHook(() => useGoogleLoginHandler())

    act(() => {
      result.current.triggerGoogleLogin()
    })

    act(() => {
      latestTokenConfig?.error_callback?.({
        type: 'popup_closed',
        message: 'Popup closed by user',
      })
    })

    expect(result.current.googleLoading).toBe(false)
    expect(result.current.googleError).toBe('Popup closed by user')
  })

  it('sets default error when error_callback is invoked without a message', () => {
    const { result } = renderHook(() => useGoogleLoginHandler())

    act(() => {
      result.current.triggerGoogleLogin()
    })

    act(() => {
      latestTokenConfig?.error_callback?.({
        type: 'unknown',
        message: '',
      })
    })

    expect(result.current.googleLoading).toBe(false)
    expect(result.current.googleError).toBe('auth.login.googleFailed')
  })

  it('sets ApiError message when loginWithGoogle rejects with ApiError', async () => {
    mocks.loginWithGoogle.mockRejectedValueOnce(new ApiError('Invalid Google credential'))

    const { result } = renderHook(() => useGoogleLoginHandler())

    act(() => {
      result.current.triggerGoogleLogin()
    })

    await act(async () => {
      await latestTokenConfig?.callback({ access_token: 'bad-token' })
    })

    expect(result.current.googleLoading).toBe(false)
    expect(result.current.googleError).toBe('Invalid Google credential')
  })

  it('sets generic error when loginWithGoogle rejects with non-ApiError', async () => {
    mocks.loginWithGoogle.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useGoogleLoginHandler())

    act(() => {
      result.current.triggerGoogleLogin()
    })

    await act(async () => {
      await latestTokenConfig?.callback({ access_token: 'any-token' })
    })

    expect(result.current.googleLoading).toBe(false)
    expect(result.current.googleError).toBe('errors.unexpected')
  })
})
