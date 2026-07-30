import axios from 'axios'

type ApiErrorOptions = {
  status?: number
  code?: string
  details?: unknown
}

type BackendError = {
  message?: string
  code?: string
  details?: unknown
}

export class ApiError extends Error {
  readonly status?: number
  readonly code?: string
  readonly details?: unknown

  constructor(message: string, options: ApiErrorOptions = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = options.status
    this.code = options.code
    this.details = options.details
  }
}

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (!axios.isAxiosError<BackendError>(error)) {
    return new ApiError(error instanceof Error ? error.message : 'Unexpected error', {
      code: 'UNEXPECTED_ERROR',
    })
  }

  const data = error.response?.data

  return new ApiError(data?.message ?? error.message, {
    status: error.response?.status,
    code: data?.code ?? (error.response ? 'API_ERROR' : 'NETWORK_ERROR'),
    details: data?.details,
  })
}
