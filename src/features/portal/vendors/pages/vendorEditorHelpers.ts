import { ApiError } from '@/shared/api'

export function parseJsonObject(value?: string) {
  if (!value?.trim()) return undefined
  const parsed: unknown = JSON.parse(value)
  if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error('Expected a JSON object')
  }
  return parsed as Record<string, unknown>
}

export const isConflictError = (error: Error): error is ApiError =>
  error instanceof ApiError && error.status === 409

export function conflictField(error: Error) {
  if (!isConflictError(error)) return undefined
  const details = error.details as
    | { field?: string; keyPattern?: Record<string, unknown>; keyValue?: Record<string, unknown> }
    | undefined
  return details?.field ?? Object.keys(details?.keyPattern ?? details?.keyValue ?? {})[0]
}
