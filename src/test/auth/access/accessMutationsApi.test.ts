import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  bulkUpdateGlobalAccess,
  createAccessAssignment,
  deleteAccessAssignment,
  setScopedRolePermissions,
  updateAccessAssignment,
  updateGlobalAccess,
} from '@/features/auth/access/api/accessMutationsApi'
import { apiClient } from '@/shared/api'

vi.mock('@/shared/api', () => ({
  apiClient: {
    delete: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}))

describe('accessMutationsApi', () => {
  beforeEach(() => {
    vi.mocked(apiClient.patch).mockResolvedValue({ success: true, data: {} })
    vi.mocked(apiClient.post).mockResolvedValue({ success: true, data: {} })
    vi.mocked(apiClient.delete).mockResolvedValue({ success: true, data: {} })
    vi.mocked(apiClient.put).mockResolvedValue({ success: true, data: {} })
  })

  it('updates global roles and custom permissions for an account', async () => {
    await updateGlobalAccess('account-1', {
      roleIds: ['role-1'],
      customPermissionIds: ['permission-1'],
    })

    expect(apiClient.patch).toHaveBeenCalledWith('/api/auth/accounts/account-1/access', {
      roleIds: ['role-1'],
      customPermissionIds: ['permission-1'],
    })
  })

  it('updates roles for multiple accounts with validity window', async () => {
    await bulkUpdateGlobalAccess({
      accountIds: ['account-1', 'account-2'],
      roleIds: ['role-1'],
      customPermissionIds: ['permission-1'],
      validFrom: '2026-08-01T08:00:00Z',
      validUntil: '2026-08-01T10:00:00Z',
    })

    expect(apiClient.post).toHaveBeenCalledWith('/api/auth/accounts/access/bulk', {
      accountIds: ['account-1', 'account-2'],
      roleIds: ['role-1'],
      customPermissionIds: ['permission-1'],
      validFrom: '2026-08-01T08:00:00Z',
      validUntil: '2026-08-01T10:00:00Z',
    })
  })

  it('creates, updates, and deletes a scoped assignment through its documented routes', async () => {
    const assignment = {
      accountId: 'account-1',
      roleId: 'role-1',
      scopeType: 'SHOP',
      scopeId: 'shop-1',
      customPermissionIds: ['permission-1'],
      validFrom: '2026-08-01T08:00:00',
      validUntil: '2026-08-01T10:00:00',
    }

    await createAccessAssignment(assignment)
    await updateAccessAssignment('assignment-1', { roleId: 'role-2', status: 'inactive' })
    await deleteAccessAssignment('assignment-1')

    expect(apiClient.post).toHaveBeenCalledWith('/api/auth/access-assignments', assignment)
    expect(apiClient.patch).toHaveBeenCalledWith('/api/auth/access-assignments/assignment-1', {
      roleId: 'role-2',
      status: 'inactive',
    })
    expect(apiClient.delete).toHaveBeenCalledWith('/api/auth/access-assignments/assignment-1')
  })

  it('replaces scoped role permissions using permissionIds', async () => {
    await setScopedRolePermissions({
      scopeType: 'SHOP',
      scopeId: 'shop-1',
      roleId: 'role-1',
      permissionIds: ['permission-1', 'permission-2'],
    })

    expect(apiClient.put).toHaveBeenCalledWith('/api/auth/scoped-role-permissions', {
      scopeType: 'SHOP',
      scopeId: 'shop-1',
      roleId: 'role-1',
      permissionIds: ['permission-1', 'permission-2'],
    })
  })
})
