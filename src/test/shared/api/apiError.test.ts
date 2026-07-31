import { AxiosError, type AxiosResponse } from 'axios'
import { describe, expect, it } from 'vitest'

import { ApiError, normalizeApiError } from '@/shared/api/apiError'

describe('normalizeApiError', () => {
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
      message: 'Invalid payload',
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
      message: 'Employee profile has duplicate fields',
      status: 409,
      code: 'CONFLICT_ERROR',
    })
  })

  it('normalizes an Axios network failure', () => {
    expect(normalizeApiError(new AxiosError('Network Error'))).toMatchObject({
      name: 'ApiError',
      message: 'Network Error',
      code: 'NETWORK_ERROR',
    })
  })

  it('does not wrap an existing ApiError twice', () => {
    const error = new ApiError('Already normalized', { code: 'KNOWN' })

    expect(normalizeApiError(error)).toBe(error)
  })
})
