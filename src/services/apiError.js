import axios from 'axios'

export class ApiError extends Error {
  constructor({ message, status, data, code }) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
    this.code = code
  }
}

export function normalizeApiError(error) {
  if (!axios.isAxiosError(error)) return error

  const status = error.response?.status
  const data = error.response?.data
  const backendError = data && typeof data === 'object' ? data.error : undefined
  const serverMessage = data?.message || backendError?.message

  return new ApiError({
    message: serverMessage || 'errors.api.network',
    status,
    data,
    code: backendError?.code || error.code,
  })
}
