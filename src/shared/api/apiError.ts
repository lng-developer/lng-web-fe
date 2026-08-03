import axios from 'axios'

type ApiErrorOptions = {
  status?: number
  code?: string
  details?: unknown
  requestId?: string
}

type BackendError = {
  message?: string
  code?: string
  details?: unknown
  requestId?: string
}

type BackendErrorResponse = BackendError & {
  error?: BackendError
}

export class ApiError extends Error {
  readonly status?: number
  readonly code?: string
  readonly details?: unknown
  readonly requestId?: string

  constructor(message: string, options: ApiErrorOptions = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = options.status
    this.code = options.code
    this.details = options.details
    this.requestId = options.requestId
  }
}

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (!axios.isAxiosError<BackendErrorResponse>(error)) {
    return new ApiError(error instanceof Error ? error.message : 'Unexpected error', {
      code: 'UNEXPECTED_ERROR',
    })
  }

  const data = error.response?.data
  const backendError = data?.error ?? data

  return new ApiError(backendError?.message ?? error.message, {
    status: error.response?.status,
    code: backendError?.code ?? (error.response ? 'API_ERROR' : 'NETWORK_ERROR'),
    details: backendError?.details,
    requestId: backendError?.requestId,
  })
}
