import axios from 'axios'

import i18n from '@/shared/i18n/i18n'

type ApiErrorOptions = {
  status?: number
  code?: string
  details?: unknown
  requestId?: string
  rawMessage?: string
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
  readonly rawMessage: string

  constructor(message: string, options: ApiErrorOptions = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = options.status
    this.code = options.code
    this.details = options.details
    this.requestId = options.requestId
    this.rawMessage = options.rawMessage ?? message
  }
}

const localizedErrorCodes = new Set([
  'APP_ERROR',
  'VALIDATION_ERROR',
  'AUTHENTICATION_ERROR',
  'AUTHORIZATION_ERROR',
  'ACCOUNT_SETUP_REQUIRED',
  'RESOURCE_NOT_FOUND',
  'CONFLICT_ERROR',
  'RATE_LIMIT_ERROR',
  'PAYLOAD_TOO_LARGE',
  'MEDIA_UPLOAD_EXPIRED',
  'MEDIA_UPLOAD_INCOMPLETE',
  'MEDIA_FILE_TOO_LARGE',
  'MEDIA_FILE_TYPE_INVALID',
  'MEDIA_ASSET_NOT_READY',
  'INTERNAL_SERVER_ERROR',
])

function getLocalizedMessage(code?: string) {
  return code && localizedErrorCodes.has(code)
    ? i18n.t(`errors.api.${code}`)
    : i18n.t('errors.unexpected')
}

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (!axios.isAxiosError<BackendErrorResponse>(error)) {
    const rawMessage = error instanceof Error ? error.message : 'Unexpected error'
    console.error('[LNG] request failed', error)
    return new ApiError(
      error instanceof Error && error.message ? error.message : getLocalizedMessage(),
      {
        code: 'UNEXPECTED_ERROR',
        rawMessage,
      },
    )
  }

  const data = error.response?.data
  const backendError = data?.error ?? data
  const code = backendError?.code ?? (error.response ? 'API_ERROR' : 'NETWORK_ERROR')
  const rawMessage = backendError?.message ?? error.message

  console.error('[LNG] request failed', {
    code,
    status: error.response?.status,
    details: backendError?.details,
    requestId: backendError?.requestId,
    message: rawMessage,
  })

  return new ApiError(getLocalizedMessage(code), {
    status: error.response?.status,
    code,
    details: backendError?.details,
    requestId: backendError?.requestId,
    rawMessage,
  })
}

export function extractApiErrorMessage(
  error: unknown,
  fallbackTitle?: string,
): { title: string; description?: string } {
  const defaultTitle = fallbackTitle || i18n.t('errors.unexpected', 'Thao tác thất bại')
  const apiError = normalizeApiError(error)
  let detailText: string | undefined

  if (Array.isArray(apiError.details) && apiError.details.length > 0) {
    detailText = apiError.details
      .map((d: unknown) => {
        const obj = d as { message?: unknown } | null
        return typeof obj?.message === 'string' ? obj.message : ''
      })
      .filter(Boolean)
      .join('; ')
  } else if (apiError.details && typeof apiError.details === 'object') {
    detailText = Object.values(apiError.details)
      .map((v: unknown) => {
        const obj = v as { message?: unknown } | null
        return typeof obj?.message === 'string' ? obj.message : String(v || '')
      })
      .filter(Boolean)
      .join('; ')
  }

  const raw =
    apiError.rawMessage &&
    !apiError.rawMessage.toLowerCase().includes('request failed') &&
    !apiError.rawMessage.toLowerCase().includes('unexpected')
      ? apiError.rawMessage
      : undefined

  const candidate =
    detailText ||
    raw ||
    (apiError.message && !apiError.message.toLowerCase().includes('unexpected')
      ? apiError.message
      : undefined)

  if (candidate) {
    const lower = candidate.toLowerCase()
    if (lower.includes('psd-compatible filename') || lower.includes('psd template asset')) {
      return {
        title: defaultTitle,
        description: i18n.t('portal.design.psdInvalidExtension'),
      }
    }
    if (lower.includes('rejectreason is required')) {
      return {
        title: defaultTitle,
        description: i18n.t('portal.design.reasonRequired'),
      }
    }
    return {
      title: defaultTitle,
      description: candidate,
    }
  }

  return {
    title: defaultTitle,
    description: apiError.message || undefined,
  }
}
