import { ApiResponse } from '@/server/type'
import { apiClient } from '@/shared/api'

export type ManagedAccountScope = {
  assignmentId: string
  roleId: string | null
  scopeType: string
  scopeId: string | null
  resourceId: string | null
  scopeName?: string | null
  roles?: string[]
  permissions?: string[]
  customPermissionIds?: string[]
  overridePermissionIds?: string[] | null
  isPermissionOverridden?: boolean
}

export type ManagedAccount = {
  account: {
    email: string
    id: string
    status?: string
    roles?: string[]
    lastLoginAt?: string | null
    lastLoginIp?: string | null
    operatingCostAmount?: number
    operatingCostStartedAt?: string | null
    deactivatedAt?: string | null
  }
  access?: {
    roleIds?: string[]
    customPermissionIds?: string[]
    validFrom?: string | null
    validUntil?: string | null
  }
  roles?: string[]
  permissions?: string[]
  effectiveRoles?: string[]
  effectivePermissions?: string[]
  scopes?: ManagedAccountScope[]
}

export type AccountAssignmentInput = {
  roleId: string
  scopeType: 'global' | 'department' | 'team' | 'shop' | 'vendor' | 'own'
  scopeId: string | null
  customPermissionIds?: string[]
  overridePermissionIds?: string[]
}

export type CreateAccountInput = {
  email: string
  password: string
  assignments: AccountAssignmentInput[]
}

function unwrap<T>(response: unknown): T {
  return (response as ApiResponse<T>).data
}

export async function loadAccount(accountId: string) {
  return unwrap<ManagedAccount>(await apiClient.get(`/api/auth/accounts/${accountId}`))
}

export async function createAccount(input: CreateAccountInput) {
  return unwrap(await apiClient.post('/api/auth/accounts', input))
}

export async function updateAccountEmail(accountId: string, email: string) {
  return unwrap(await apiClient.patch(`/api/auth/accounts/${accountId}/email`, { email }))
}

export async function updateAccountStatus(accountId: string, status: 'active' | 'inactive') {
  return unwrap(await apiClient.patch(`/api/auth/accounts/${accountId}/status`, { status }))
}
export async function updateAccountOperatingCost(
  accountId: string,
  operatingCostAmount: number,
  operatingCostStartedAt: string | null,
) {
  return unwrap(
    await apiClient.patch(`/api/auth/accounts/${accountId}/operating-cost`, {
      operatingCostAmount,
      operatingCostStartedAt,
    }),
  )
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
