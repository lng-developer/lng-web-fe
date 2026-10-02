/** @vitest-environment jsdom */

import { AxiosError, type AxiosResponse } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError, normalizeApiError } from '@/shared/api/apiError'
import i18n from '@/shared/i18n/i18n'

describe('normalizeApiError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(async () => {
    await i18n.changeLanguage('en')
    vi.restoreAllMocks()
  })

  it('localizes a backend error code instead of exposing its Vietnamese message', async () => {
    await i18n.changeLanguage('en')
    const error = new AxiosError('Request failed')
    error.response = {
      data: {
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Xác thực tài khoản Microsoft không hợp lệ hoặc đã hết hạn',
        },
      },
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config: error.config,
    } as AxiosResponse

    const normalized = normalizeApiError(error)

    expect(normalized.message).toBe('Unable to sign in. Please try again.')
    expect(normalized.rawMessage).toBe('Xác thực tài khoản Microsoft không hợp lệ hoặc đã hết hạn')
  })

  it('keeps backend error details from an Axios response', () => {
    const error = new AxiosError('Request failed')
    error.response = {
      data: {
        code: 'VALIDATION_FAILED',
        message: 'Invalid payload',
        details: { field: 'name' },
      },
      status: 422,
      statusText: 'Unprocessable Entity',
      headers: {},
      config: error.config,
    } as AxiosResponse

    expect(normalizeApiError(error)).toMatchObject({
      name: 'ApiError',
      message: 'Something went wrong. Please try again.',
      rawMessage: 'Invalid payload',
      status: 422,
      code: 'VALIDATION_FAILED',
      details: { field: 'name' },
    })
  })

  it('reads the standard backend error envelope', () => {
    const error = new AxiosError('Request failed with status code 409')
    error.response = {
      data: {
        success: false,
        error: {
          code: 'CONFLICT_ERROR',
          message: 'Employee profile has duplicate fields',
          requestId: 'request-1',
        },
      },
      status: 409,
      statusText: 'Conflict',
      headers: {},
      config: error.config,
    } as AxiosResponse

    expect(normalizeApiError(error)).toMatchObject({
      message: 'This information conflicts with an existing record.',
      rawMessage: 'Employee profile has duplicate fields',
      status: 409,
      code: 'CONFLICT_ERROR',
    })
  })

  it('normalizes an Axios network failure', () => {
    expect(normalizeApiError(new AxiosError('Network Error'))).toMatchObject({
      name: 'ApiError',
      message: 'Something went wrong. Please try again.',
      rawMessage: 'Network Error',
      code: 'NETWORK_ERROR',
    })
  })

  it('does not wrap an existing ApiError twice', () => {
    const error = new ApiError('Already normalized', { code: 'KNOWN' })

    expect(normalizeApiError(error)).toBe(error)
  })
})
