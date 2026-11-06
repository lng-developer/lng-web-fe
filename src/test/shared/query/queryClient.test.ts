import { describe, expect, it } from 'vitest'
import { AxiosError, type AxiosResponse } from 'axios'

import { queryClient } from '@/shared/query/queryClient'

describe('queryClient', () => {
  const queriesOptions = queryClient.getDefaultOptions().queries
  const retry = queriesOptions?.retry as (failureCount: number, error: unknown) => boolean

  it('configures refetchOnReconnect to true', () => {
    expect(queriesOptions?.refetchOnReconnect).toBe(true)
  })

  it('does not retry 4xx client errors (400, 401, 403, 404, 422)', () => {
    const statuses = [400, 401, 403, 404, 422]

    for (const status of statuses) {
      const error = new AxiosError(`Error ${status}`, String(status), undefined, undefined, {
        status,
      } as AxiosResponse)

      expect(retry(0, error)).toBe(false)
      expect(retry(1, error)).toBe(false)
    }
  })

  it('retries server errors (500) and network errors when failureCount < 2', () => {
    const serverError = new AxiosError('Internal Server Error', '500', undefined, undefined, {
      status: 500,
    } as AxiosResponse)
    const networkError = new AxiosError('Network Error')
    const genericError = new Error('Generic Error')

    expect(retry(0, serverError)).toBe(true)
    expect(retry(1, serverError)).toBe(true)
    expect(retry(2, serverError)).toBe(false)

    expect(retry(0, networkError)).toBe(true)
    expect(retry(1, networkError)).toBe(true)
    expect(retry(2, networkError)).toBe(false)

    expect(retry(0, genericError)).toBe(true)
    expect(retry(1, genericError)).toBe(true)
    expect(retry(2, genericError)).toBe(false)
  })

  it('stops retrying when failureCount >= 2', () => {
    const serverError = new AxiosError('Internal Server Error', '500', undefined, undefined, {
      status: 500,
    } as AxiosResponse)

    expect(retry(2, serverError)).toBe(false)
    expect(retry(3, serverError)).toBe(false)
  })
})
