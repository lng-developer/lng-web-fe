import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createRole,
  deleteRole,
  loadRoleCatalog,
  updateRole,
} from '@/features/auth/roles/api/rolesApi'
import { apiClient } from '@/shared/api'

vi.mock('@/shared/api', () => ({
  apiClient: {
    delete: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}))

describe('rolesApi', () => {
  beforeEach(() => {
    vi.mocked(apiClient.delete).mockResolvedValue({ success: true, data: {} })
    vi.mocked(apiClient.get).mockResolvedValue({ success: true, data: { items: [], total: 0 } })
    vi.mocked(apiClient.patch).mockResolvedValue({ success: true, data: {} })
    vi.mocked(apiClient.post).mockResolvedValue({ success: true, data: {} })
  })

  it('loads roles with the permission catalog needed by the role editor', async () => {
    await loadRoleCatalog()

    expect(apiClient.get).toHaveBeenCalledWith('/api/auth/roles', { params: { limit: 100 } })
    expect(apiClient.get).toHaveBeenCalledWith('/api/auth/permissions', { params: { limit: 100 } })
  })

  it('uses Auth role management routes for create, update, and delete', async () => {
    const role = {
      code: 'REVIEWER',
      description: 'Review work',
      name: 'Reviewer',
      permissionIds: ['permission-1'],
    }

    await createRole(role)
    await updateRole('role-1', { ...role, name: 'Quality reviewer' })
    await deleteRole('role-1')

    expect(apiClient.post).toHaveBeenCalledWith('/api/auth/roles', role)
    expect(apiClient.patch).toHaveBeenCalledWith('/api/auth/roles/role-1', {
      ...role,
      name: 'Quality reviewer',
    })
    expect(apiClient.delete).toHaveBeenCalledWith('/api/auth/roles/role-1')
  })
})
