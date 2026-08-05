import { apiClient } from '@/shared/api'

type ApiResponse<T> = { data: T; success: boolean }

export type RoleInput = {
  code: string
  description?: string | null
  name: string
  permissionIds: string[]
}

export type RoleCatalog = {
  permissions: {
    items: { code: string; description?: string; id: string; name?: string }[]
    total: number
  }
  roles: {
    items: {
      code: string
      description?: string
      id: string
      name?: string
      permissionIds?: string[]
      permissions?: string[]
    }[]
    total: number
  }
}

function unwrap<T>(response: unknown): T {
  return (response as ApiResponse<T>).data
}

export async function loadRoleCatalog(): Promise<RoleCatalog> {
  const [roles, permissions] = await Promise.all([
    apiClient.get('/api/auth/roles', { params: { limit: 100 } }),
    apiClient.get('/api/auth/permissions', { params: { limit: 100 } }),
  ])

  return { permissions: unwrap(permissions), roles: unwrap(roles) }
}

export async function createRole(input: RoleInput) {
  return unwrap(await apiClient.post('/api/auth/roles', input))
}

export async function updateRole(roleId: string, input: RoleInput) {
  return unwrap(await apiClient.patch(`/api/auth/roles/${roleId}`, input))
}

export async function deleteRole(roleId: string) {
  return unwrap(await apiClient.delete(`/api/auth/roles/${roleId}`))
}
