import { apiClient } from '@/shared/api'

type ApiResponse<T> = { data: T; success: boolean }

export type PermissionInput = { code: string; description?: string | null; name?: string | null }
export type PermissionList = {
  items: { code: string; description?: string; id: string; name?: string }[]
  total: number
}

function unwrap<T>(response: unknown): T {
  return (response as ApiResponse<T>).data
}

export async function loadPermissions(): Promise<PermissionList> {
  return unwrap(await apiClient.get('/api/auth/permissions', { params: { limit: 100 } }))
}

export async function createPermission(input: PermissionInput) {
  return unwrap(await apiClient.post('/api/auth/permissions', input))
}

export async function updatePermission(permissionId: string, input: PermissionInput) {
  return unwrap(await apiClient.patch(`/api/auth/permissions/${permissionId}`, input))
}

export async function deletePermission(permissionId: string) {
  return unwrap(await apiClient.delete(`/api/auth/permissions/${permissionId}`))
}
