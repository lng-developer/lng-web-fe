import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createPermission,
  deletePermission,
  loadPermissions,
  updatePermission,
} from '@/features/auth/permissions/api/permissionsApi'
import { apiClient } from '@/shared/api'

vi.mock('@/shared/api', () => ({
  apiClient: { delete: vi.fn(), get: vi.fn(), patch: vi.fn(), post: vi.fn() },
}))

describe('permissionsApi', () => {
  beforeEach(() => {
    vi.mocked(apiClient.delete).mockResolvedValue({ success: true, data: {} })
    vi.mocked(apiClient.get).mockResolvedValue({ success: true, data: { items: [], total: 0 } })
    vi.mocked(apiClient.patch).mockResolvedValue({ success: true, data: {} })
    vi.mocked(apiClient.post).mockResolvedValue({ success: true, data: {} })
  })

  it('uses Auth permission catalog routes for each mutation', async () => {
    const permission = { code: 'ORDERS:READ', description: 'Read orders', name: 'Read orders' }
    await loadPermissions()
    await createPermission(permission)
    await updatePermission('permission-1', permission)
    await deletePermission('permission-1')

    expect(apiClient.get).toHaveBeenCalledWith('/api/auth/permissions', { params: { limit: 100 } })
    expect(apiClient.post).toHaveBeenCalledWith('/api/auth/permissions', permission)
    expect(apiClient.patch).toHaveBeenCalledWith('/api/auth/permissions/permission-1', permission)
    expect(apiClient.delete).toHaveBeenCalledWith('/api/auth/permissions/permission-1')
  })
})
