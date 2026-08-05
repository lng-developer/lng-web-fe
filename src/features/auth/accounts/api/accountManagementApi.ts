import { apiClient } from '@/shared/api'

type ApiResponse<T> = { data: T; success: boolean }

export type ManagedAccount = {
  account: {
    email: string
    id: string
    status?: string
  }
}

function unwrap<T>(response: unknown): T {
  return (response as ApiResponse<T>).data
}

export async function loadAccount(accountId: string) {
  return unwrap<ManagedAccount>(await apiClient.get(`/api/auth/accounts/${accountId}`))
}

export async function updateAccountEmail(accountId: string, email: string) {
  return unwrap(await apiClient.patch(`/api/auth/accounts/${accountId}/email`, { email }))
}

export async function updateAccountStatus(accountId: string, status: 'active' | 'inactive') {
  return unwrap(await apiClient.patch(`/api/auth/accounts/${accountId}/status`, { status }))
}

export async function resetAccountPassword(accountId: string, password: string) {
  return unwrap(await apiClient.patch(`/api/auth/accounts/${accountId}/password`, { password }))
}

export async function revokeAccountSessions(accountId: string) {
  return unwrap(await apiClient.post(`/api/auth/accounts/${accountId}/revoke-sessions`))
}

export async function archiveAccount(accountId: string) {
  return unwrap(await apiClient.delete(`/api/auth/accounts/${accountId}`))
}
