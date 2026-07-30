import { apiClient } from '@/shared/api'

type ApiResponse<T> = { data: T; success: boolean }

export type GlobalAccessInput = {
  customPermissionIds: string[]
  roleIds: string[]
}

export type AccessAssignmentInput = {
  accountId: string
  customPermissionIds?: string[]
  roleId: string
  scopeId: string
  scopeType: string
}

export type AccessAssignmentUpdate = Partial<Omit<AccessAssignmentInput, 'accountId'>> & {
  status?: string
}

export type ScopedRolePermissionInput = {
  permissionIds: string[]
  roleId: string
  scopeId: string
  scopeType: string
}

function unwrap<T>(response: unknown): T {
  return (response as ApiResponse<T>).data
}

export async function updateGlobalAccess(accountId: string, input: GlobalAccessInput) {
  return unwrap(await apiClient.patch(`/api/auth/accounts/${accountId}/access`, input))
}

export async function createAccessAssignment(input: AccessAssignmentInput) {
  return unwrap(await apiClient.post('/api/auth/access-assignments', input))
}

export async function updateAccessAssignment(assignmentId: string, input: AccessAssignmentUpdate) {
  return unwrap(await apiClient.patch(`/api/auth/access-assignments/${assignmentId}`, input))
}

export async function deleteAccessAssignment(assignmentId: string) {
  return unwrap(await apiClient.delete(`/api/auth/access-assignments/${assignmentId}`))
}

export async function setScopedRolePermissions(input: ScopedRolePermissionInput) {
  return unwrap(await apiClient.put('/api/auth/scoped-role-permissions', input))
}
