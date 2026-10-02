import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  loginPopup: vi.fn(),
  loginWithMicrosoft: vi.fn(),
}))

vi.mock('@/features/auth/api/authApi', () => ({
  loginWithMicrosoft: mocks.loginWithMicrosoft,
}))

vi.mock('@/features/auth/microsoft/msalClient', () => ({
  clearStuckMsalInteraction: vi.fn(),
  getMsalInstance: vi.fn().mockResolvedValue({ loginPopup: mocks.loginPopup }),
}))

vi.mock('@/shared/api', () => ({
  ApiError: class ApiError extends Error {},
}))

vi.mock('@/shared/config/env', () => ({
  env: { microsoftClientId: 'microsoft-client-id' },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

import { useMicrosoftLoginHandler } from '@/features/auth/microsoft/useMicrosoftLoginHandler'

describe('useMicrosoftLoginHandler', () => {
  beforeEach(() => {
    mocks.loginPopup.mockReset()
    mocks.loginWithMicrosoft.mockReset()
  })

  it('uses a popup result to log in without relying on a redirect callback', async () => {
    mocks.loginPopup.mockResolvedValue({ idToken: 'microsoft-id-token' })
    mocks.loginWithMicrosoft.mockResolvedValue(undefined)
    const { result } = renderHook(() => useMicrosoftLoginHandler())

    await act(async () => {
      await result.current.triggerMicrosoftLogin()
    })

    expect(mocks.loginPopup).toHaveBeenCalledWith({
      scopes: ['openid', 'profile', 'email', 'User.Read'],
      prompt: 'select_account',
      redirectUri: `${window.location.origin}/msal-popup.html`,
      extraQueryParameters: { domain_hint: 'lngwork.co' },
    })
    expect(mocks.loginWithMicrosoft).toHaveBeenCalledWith('microsoft-id-token')
  })

  it('resets the loading state when Chrome restores the login page from Back navigation', async () => {
    mocks.loginPopup.mockReturnValue(new Promise(() => undefined))
    const { result } = renderHook(() => useMicrosoftLoginHandler())

    act(() => {
      void result.current.triggerMicrosoftLogin()
    })

    await waitFor(() => expect(result.current.microsoftLoading).toBe(true))

    act(() => {
      window.dispatchEvent(new Event('pageshow'))
    })

    expect(result.current.microsoftLoading).toBe(false)
  })

  it('stops loading when focus returns after a Microsoft popup is closed without responding', async () => {
    mocks.loginPopup.mockReturnValue(new Promise(() => undefined))
    const { result } = renderHook(() => useMicrosoftLoginHandler())

    act(() => {
      void result.current.triggerMicrosoftLogin()
    })

    await waitFor(() => expect(result.current.microsoftLoading).toBe(true))

    act(() => {
      window.dispatchEvent(new Event('blur'))
      window.dispatchEvent(new Event('focus'))
    })

    expect(result.current.microsoftLoading).toBe(false)
    expect(result.current.microsoftError).toBeNull()
  })

  it('keeps a raw Microsoft timeout out of the UI error message', async () => {
    mocks.loginPopup.mockRejectedValue(
      new Error('timed_out: See https://aka.ms/msal.js.errors#timed_out for details'),
    )
    const { result } = renderHook(() => useMicrosoftLoginHandler())

    await act(async () => {
      await result.current.triggerMicrosoftLogin()
    })

    expect(result.current.microsoftError).toBe('errors.unexpected')
  })
})
